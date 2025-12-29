import { createClient } from 'pexels';
import { NextRequest, NextResponse } from 'next/server';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'RZBtTmsnUjIVB6W9U48aqmqf3TIoqCRNnDtfPx1KDwzX52sLJxbi1hNs';
const client = createClient(PEXELS_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { goals } = await request.json();

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { error: 'Goals array is required' },
        { status: 400 }
      );
    }

    // Filter out empty goals
    const validGoals = goals.filter((goal: string) => goal.trim() !== '');

    if (validGoals.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid goal is required' },
        { status: 400 }
      );
    }

    // Fetch one image for each goal
    const imagePromises = validGoals.map(async (goal: string) => {
      try {
        const response = await client.photos.search({
          query: goal.trim(),
          per_page: 1,
        });

        if ('photos' in response && response.photos.length > 0) {
          const photo = response.photos[0];
          return {
            goal,
            imageUrl: photo.src.large2x || photo.src.large || photo.src.original,
            photographer: photo.photographer,
            alt: photo.alt || goal,
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching image for goal "${goal}":`, error);
        return null;
      }
    });

    const images = await Promise.all(imagePromises);
    const validImages = images.filter((img) => img !== null);

    if (validImages.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch images for any goals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ images: validImages });
  } catch (error) {
    console.error('Error in Pexels API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

