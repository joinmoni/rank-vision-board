/**
 * Image Provider Abstraction
 * 
 * Pluggable interface for fetching images from different sources.
 * The layout and canvas code should not know where images come from.
 */

import { ImageSearchQuery, ImageAsset, ImageWithGoal } from "./types";

export interface ImageProvider {
  searchImages(queries: ImageSearchQuery[]): Promise<ImageAsset[]>;
  // New method that preserves goal metadata
  searchImagesWithGoals(queries: ImageSearchQuery[]): Promise<ImageWithGoal[]>;
}

/**
 * Pexels Image Provider Implementation
 * 
 * Optimized for lifestyle/social media style images.
 * Uses per_page=10 for better variety.
 */
export class PexelsProvider implements ImageProvider {
  private apiKey: string;
  private baseUrl = "https://api.pexels.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchImages(queries: ImageSearchQuery[]): Promise<ImageAsset[]> {
    const withGoals = await this.searchImagesWithGoals(queries);
    return withGoals.map(img => ({
      id: img.id,
      url: img.url,
      width: img.width,
      height: img.height,
      photographer: img.photographer,
      source: img.source,
      downloadUrl: img.downloadUrl,
    }));
  }

  async searchImagesWithGoals(queries: ImageSearchQuery[]): Promise<ImageWithGoal[]> {
    console.log(`🖼️  [PEXELS] Starting image search for ${queries.length} queries`);
    const allImages: ImageWithGoal[] = [];
    const queryResults: Array<{ query: string; imagesFound: number; imagesAfterFilter: number }> = [];

    for (let i = 0; i < queries.length; i++) {
      const searchQuery = queries[i];
      const goalIndex = searchQuery.goalIndex ?? -1;
      const goalText = searchQuery.goalText ?? "";
      
      console.log(`🔍 [PEXELS] Query ${i + 1}/${queries.length}: "${searchQuery.query}" (${searchQuery.orientation})${goalText ? ` [Goal: ${goalText}]` : ""}`);
      try {
        const result = await this.searchPexelsWithGoal(searchQuery, i + 1, queries.length);
        queryResults.push({
          query: searchQuery.query,
          imagesFound: result.length,
          imagesAfterFilter: result.length,
        });
        console.log(`✅ [PEXELS] Found ${result.length} images for "${searchQuery.query}"`);
        allImages.push(...result);
      } catch (error: any) {
        console.error(`❌ [PEXELS] Error searching for "${searchQuery.query}":`, error.message);
        queryResults.push({
          query: searchQuery.query,
          imagesFound: 0,
          imagesAfterFilter: 0,
        });
        // Continue with other queries even if one fails
      }
    }

    // De-duplicate by ID, keeping the first occurrence (which should have highest relevance)
    const uniqueImagesMap = new Map<string, ImageWithGoal>();
    for (const img of allImages) {
      if (!uniqueImagesMap.has(img.id)) {
        uniqueImagesMap.set(img.id, img);
      }
    }
    const uniqueImages = Array.from(uniqueImagesMap.values());

    return uniqueImages;
  }

  private async searchPexels(
    searchQuery: ImageSearchQuery,
    queryIndex?: number,
    totalQueries?: number
  ): Promise<ImageAsset[]> {
    const withGoals = await this.searchPexelsWithGoal(searchQuery, queryIndex, totalQueries);
    return withGoals.map(img => ({
      id: img.id,
      url: img.url,
      width: img.width,
      height: img.height,
      photographer: img.photographer,
      source: img.source,
      downloadUrl: img.downloadUrl,
    }));
  }

  private async searchPexelsWithGoal(
    searchQuery: ImageSearchQuery,
    queryIndex?: number,
    totalQueries?: number
  ): Promise<ImageWithGoal[]> {
    const orientation = this.mapOrientation(searchQuery.orientation);
    const query = encodeURIComponent(searchQuery.query);
    
    
    // Fetch multiple pages to get more images (up to 3 pages = 30 images per query)
    const allPhotos: any[] = [];
    const maxPages = 3;
    const perPage = 10;
    
    for (let page = 1; page <= maxPages; page++) {
      const url = `${this.baseUrl}/search?query=${query}&orientation=${orientation}&per_page=${perPage}&page=${page}`;
      
      // Safe URL for logging (remove API key if present)
      const safeUrl = url.replace(/[?&]key=[^&]*/, "");
      
      console.log(`📡 [PEXELS] Fetching page ${page}: ${url.substring(0, 100)}...`);

      const response = await fetch(url, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      console.log(`📊 [PEXELS] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        if (page === 1) {
          const errorText = await response.text();
          console.error(`❌ [PEXELS] API error response:`, errorText);
          throw new Error(`Pexels API error: ${response.status} - ${errorText}`);
        }
        // If later pages fail, just break (we have some images)
        break;
      }

      const data = await response.json();
      const photos = data.photos || [];
      allPhotos.push(...photos);
      
      console.log(`✅ [PEXELS] Page ${page}: Received ${photos.length} photos (total so far: ${allPhotos.length})`);
      
      // If we got fewer than per_page, we've reached the end
      if (photos.length < perPage) {
        break;
      }
    }
    
    
    // Filter for minimum resolution (at least 800px on smallest side)
    const minResolution = 800;
    const resolutionFiltered = allPhotos.filter((photo: any) => {
      const minDimension = Math.min(photo.width, photo.height);
      return minDimension >= minResolution;
    });
    
    console.log(`📸 [PEXELS] Total: ${allPhotos.length} photos, ${resolutionFiltered.length} meet resolution requirements`);
    
    // Post-Pexels filtering: reject irrelevant content and bias toward POC
    const excludedKeywords = [
      "tomato", "tomatoes", "produce", "vegetable vendor", "fruit stand",
      "market stall", "bazaar", "agriculture", "farming", "vegetables",
    ];
    
    // Extract search query keywords for relevance checking
    const searchQueryLower = searchQuery.query.toLowerCase();
    const searchKeywords = searchQueryLower.split(/\s+/).filter(w => w.length > 2);
    
    
    const scoredPhotos = resolutionFiltered
      .map((photo: any) => {
        // Build relevance score
        let relevanceScore = 0;
        const scoreBreakdown: Array<{ reason: string; points: number }> = [];
        
        // Check photo metadata (title, alt, tags if available)
        const photoText = [
          photo.alt || "",
          photo.photographer || "",
          photo.url || "",
        ].join(" ").toLowerCase();
        
        // Negative: reject if matches excluded keywords
        const hasExcludedKeyword = excludedKeywords.some(keyword =>
          photoText.includes(keyword.toLowerCase())
        );
        if (hasExcludedKeyword) {
          return { photo, relevanceScore: -1, scoreBreakdown: [], rejected: true, rejectionReason: "excluded keyword", photoText: photo.alt || photo.photographer || "" };
        }
        
        // Positive: matches search query keywords
        searchKeywords.forEach(keyword => {
          if (photoText.includes(keyword)) {
            relevanceScore += 2;
            scoreBreakdown.push({ reason: `matches keyword "${keyword}"`, points: 2 });
          }
        });
        
        // Positive: includes POC descriptors (strong bias)
        const pocDescriptors = [
          "black", "african", "afro", "diverse", "woman of color",
          "people of color", "brown", "latina", "asian",
        ];
        pocDescriptors.forEach(descriptor => {
          if (photoText.includes(descriptor)) {
            relevanceScore += 5; // Strong positive signal
            scoreBreakdown.push({ reason: `POC descriptor "${descriptor}"`, points: 5 });
          }
        });
        
        // Positive: location keywords (if search query includes location)
        const locationKeywords = [
          "tokyo", "kyoto", "osaka", "shibuya", "japan", "japanese",
          "dubai", "uae", "emirates", "marina", "downtown",
          "paris", "france", "eiffel", "seine", "montmartre",
        ];
        locationKeywords.forEach(location => {
          if (photoText.includes(location) && searchQueryLower.includes(location)) {
            relevanceScore += 3; // Location match
            scoreBreakdown.push({ reason: `location match "${location}"`, points: 3 });
          }
        });
        
        return {
          photo,
          relevanceScore,
          scoreBreakdown,
          rejected: false,
          photoText: photo.alt || photo.photographer || "",
        };
      });
    
    const rejectedPhotos = scoredPhotos.filter((item: any) => item.rejected);
    const acceptedPhotos = scoredPhotos.filter((item: any) => !item.rejected);
    
    rejectedPhotos.slice(0, 5).forEach((item: any) => {
    });
    
    const filteredPhotos = acceptedPhotos
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) // Sort by relevance (highest first)
      .filter((item: any) => item.relevanceScore >= 0) // Only keep photos with non-negative score
      .map((item: any) => item.photo); // Extract just the photo objects
    
    // Log top 10 images with relevance scores
    const topImages = acceptedPhotos
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
    
    topImages.forEach((item: any, idx: number) => {
      const alt = item.photo.alt || "";
      const photographer = item.photo.photographer || "";
      const safeUrl = (item.photo.url || "").split("?")[0]; // Remove query params
      if (item.scoreBreakdown.length > 0) {
      }
    });
    
    
    console.log(`✅ [PEXELS] After filtering: ${filteredPhotos.length} relevant photos (excluded ${resolutionFiltered.length - filteredPhotos.length} irrelevant)`);

    // Get goal metadata from query
    const goalIndex = searchQuery.goalIndex ?? -1;
    const goalText = searchQuery.goalText ?? "";

    // Map to ImageWithGoal with relevance scores
    const imagesWithGoal: ImageWithGoal[] = [];
    const acceptedPhotosSorted = acceptedPhotos.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    
    for (const item of acceptedPhotosSorted) {
      const photo = item.photo;
      imagesWithGoal.push({
        id: `pexels-${photo.id}`,
        url: photo.src.large, // Use large for composition
        downloadUrl: photo.src.original, // Use original for final export
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        source: "pexels" as const,
        goalIndex,
        goalText,
        relevanceScore: item.relevanceScore,
        matchedQuery: searchQuery.query,
        alt: photo.alt, // Store alt text for OpenAI ranking
      });
    }

    return imagesWithGoal;
  }

  private mapOrientation(
    orientation: "portrait" | "square" | "landscape"
  ): string {
    switch (orientation) {
      case "portrait":
        return "portrait";
      case "landscape":
        return "landscape";
      case "square":
        return "square";
      default:
        return "landscape";
    }
  }
}

/**
 * Unsplash Image Provider Implementation (kept for future use)
 */
export class UnsplashProvider implements ImageProvider {
  private apiKey: string;
  private baseUrl = "https://api.unsplash.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchImages(queries: ImageSearchQuery[]): Promise<ImageAsset[]> {
    const withGoals = await this.searchImagesWithGoals(queries);
    return withGoals.map(img => ({
      id: img.id,
      url: img.url,
      width: img.width,
      height: img.height,
      photographer: img.photographer,
      source: img.source,
      downloadUrl: img.downloadUrl,
    }));
  }

  async searchImagesWithGoals(queries: ImageSearchQuery[]): Promise<ImageWithGoal[]> {
    const allImages: ImageWithGoal[] = [];

    for (const searchQuery of queries) {
      try {
        const images = await this.searchUnsplashWithGoal(searchQuery);
        allImages.push(...images);
      } catch (error) {
        console.error(`Error searching Unsplash for "${searchQuery.query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    // De-duplicate by ID
    const uniqueImagesMap = new Map<string, ImageWithGoal>();
    for (const img of allImages) {
      if (!uniqueImagesMap.has(img.id)) {
        uniqueImagesMap.set(img.id, img);
      }
    }
    const uniqueImages = Array.from(uniqueImagesMap.values());

    return uniqueImages;
  }

  private async searchUnsplash(
    searchQuery: ImageSearchQuery
  ): Promise<ImageAsset[]> {
    const withGoals = await this.searchUnsplashWithGoal(searchQuery);
    return withGoals.map(img => ({
      id: img.id,
      url: img.url,
      width: img.width,
      height: img.height,
      photographer: img.photographer,
      source: img.source,
      downloadUrl: img.downloadUrl,
    }));
  }

  private async searchUnsplashWithGoal(
    searchQuery: ImageSearchQuery
  ): Promise<ImageWithGoal[]> {
    const orientation = this.mapOrientation(searchQuery.orientation);
    const query = encodeURIComponent(searchQuery.query);
    const url = `${this.baseUrl}/search/photos?query=${query}&orientation=${orientation}&per_page=3&order_by=relevant`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    const goalIndex = searchQuery.goalIndex ?? -1;
    const goalText = searchQuery.goalText ?? "";

    return results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular, // Use regular size for composition
      downloadUrl: photo.urls.full, // Full size for final export
      width: photo.width,
      height: photo.height,
      photographer: photo.user?.name,
      source: "unsplash" as const,
      goalIndex,
      goalText,
      matchedQuery: searchQuery.query,
    }));
  }

  private mapOrientation(
    orientation: "portrait" | "square" | "landscape"
  ): string {
    switch (orientation) {
      case "portrait":
        return "portrait";
      case "landscape":
        return "landscape";
      case "square":
        return "squarish";
      default:
        return "landscape";
    }
  }
}

