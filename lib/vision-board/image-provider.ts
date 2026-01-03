/**
 * Image Provider Abstraction
 * 
 * Pluggable interface for fetching images from different sources.
 * The layout and canvas code should not know where images come from.
 */

import { ImageSearchQuery, ImageAsset } from "./types";

export interface ImageProvider {
  searchImages(queries: ImageSearchQuery[]): Promise<ImageAsset[]>;
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
    console.log(`🖼️  [PEXELS] Starting image search for ${queries.length} queries`);
    const allImages: ImageAsset[] = [];

    for (let i = 0; i < queries.length; i++) {
      const searchQuery = queries[i];
      console.log(`🔍 [PEXELS] Query ${i + 1}/${queries.length}: "${searchQuery.query}" (${searchQuery.orientation})`);
      try {
        const images = await this.searchPexels(searchQuery);
        console.log(`✅ [PEXELS] Found ${images.length} images for "${searchQuery.query}"`);
        allImages.push(...images);
      } catch (error: any) {
        console.error(`❌ [PEXELS] Error searching for "${searchQuery.query}":`, error.message);
        // Continue with other queries even if one fails
      }
    }

    // De-duplicate by ID
    const uniqueImages = Array.from(
      new Map(allImages.map((img) => [img.id, img])).values()
    );

    return uniqueImages;
  }

  private async searchPexels(
    searchQuery: ImageSearchQuery
  ): Promise<ImageAsset[]> {
    const orientation = this.mapOrientation(searchQuery.orientation);
    const query = encodeURIComponent(searchQuery.query);
    
    // Fetch multiple pages to get more images (up to 3 pages = 30 images per query)
    const allPhotos: any[] = [];
    const maxPages = 3;
    const perPage = 10;
    
    for (let page = 1; page <= maxPages; page++) {
      const url = `${this.baseUrl}/search?query=${query}&orientation=${orientation}&per_page=${perPage}&page=${page}`;
      
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
    const filteredPhotos = allPhotos.filter((photo: any) => {
      const minDimension = Math.min(photo.width, photo.height);
      return minDimension >= minResolution;
    });
    
    console.log(`📸 [PEXELS] Total: ${allPhotos.length} photos, ${filteredPhotos.length} meet resolution requirements`);

    return filteredPhotos.map((photo: any) => ({
      id: `pexels-${photo.id}`,
      url: photo.src.large, // Use large for composition
      downloadUrl: photo.src.original, // Use original for final export
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      source: "pexels" as const,
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
    const allImages: ImageAsset[] = [];

    for (const searchQuery of queries) {
      try {
        const images = await this.searchUnsplash(searchQuery);
        allImages.push(...images);
      } catch (error) {
        console.error(`Error searching Unsplash for "${searchQuery.query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    // De-duplicate by ID
    const uniqueImages = Array.from(
      new Map(allImages.map((img) => [img.id, img])).values()
    );

    return uniqueImages;
  }

  private async searchUnsplash(
    searchQuery: ImageSearchQuery
  ): Promise<ImageAsset[]> {
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

    return results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular, // Use regular size for composition
      downloadUrl: photo.urls.full, // Full size for final export
      width: photo.width,
      height: photo.height,
      photographer: photo.user?.name,
      source: "unsplash" as const,
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

