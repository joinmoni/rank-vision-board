import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          details: 'Please set OPENAI_API_KEY in your .env.local file'
        },
        { status: 500 }
      );
    }

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

    // Combine all goals into a single description with text labels
    const goalsList = validGoals.map((goal, index) => `${index + 1}. ${goal.trim()}`).join('\n');
    const goalsWithText = validGoals.map((goal) => goal.trim()).join(', ');

    // Create prompt for newspaper cutout-style vision board
    // const prompt = "generate a simple cat image"
    const prompt = `Create an ultra-realistic, high-resolution photograph of a beautiful vision board with a newspaper cutout collage style that visually represents the following life goals.

Goals:
${goalsList}

Newspaper Cutout Vision Board Style Requirements:
- The image must look like a real photograph of a large cardboard paper (cardboard texture, brown/tan color, realistic cardboard material)
- The entire background should be the cardboard paper - no table, surface, or other background elements visible
- Each goal should be represented by a realistic photographic image that looks like it was cut out from a newspaper or magazine and stuck/pasted onto the cardboard paper
- Images should have the characteristic newspaper cutout aesthetic: slightly rough edges, newsprint texture, and the look of being physically cut and pasted
- The cutout images should appear stuck onto the cardboard paper with visible adhesive elements (tape, glue marks, or the look of being pasted)
- Arrange the cutout images in an artistic, collage-style layout with some overlap, varied sizes, and organic placement across the cardboard surface
- NO TEXT, LABELS, OR CAPTIONS on any images - the images should be purely visual representations without any text overlays
- Use natural lighting, realistic shadows cast by the cutouts on the cardboard surface, and true-to-life colors
- The overall composition should feel like a real, handcrafted vision board someone created by cutting images from newspapers and pasting them onto cardboard

Photography Style:
- Photorealistic, documentary-style photography taken with a professional DSLR camera
- Shot from above (top-down view) or at a slight angle to show the cardboard paper and all cutout images
- The cardboard paper should fill the entire frame as the background
- Natural lighting with realistic shadows cast by the cutout images onto the cardboard surface
- Shallow depth of field where appropriate
- Realistic imperfections (slight motion blur, natural texture, authentic lighting variations)
- Modern camera look (50mm or 35mm lens feel)

Content Requirements:
- Each goal should be represented by a realistic photographic image showing people, places, or activities related to that goal
- All people in the images must look Nigerian - featuring Nigerian features, skin tones, and characteristics (diverse Nigerian representation including various ethnic groups)
- Images should look like newspaper or magazine cutouts with visible cut edges, newsprint texture, and authentic paper quality
- NO TEXT, CAPTIONS, OR LABELS on any images - images should be purely visual without any text
- The vision board should feel authentic and personal, like something someone actually created by cutting and pasting
- Include natural elements like tape, glue marks, or adhesive residue where cutouts are stuck/pasted onto the cardboard
- The cardboard paper should be the only background - no tables, surfaces, or other objects visible
- No illustrated, painterly, CGI, or obviously AI-generated styles
- The newspaper cutout effect should be convincing and realistic

Mood:
- Inspiring, aspirational, and authentic
- Feels like a real vision board someone made by cutting images from newspapers
- Warm, personal, and motivational
- Has the nostalgic, DIY aesthetic of newspaper collages

Output:
- One single, realistic photographic image of a large cardboard paper background with newspaper cutout-style images stuck/pasted onto it
- All images must be purely visual with NO TEXT, LABELS, OR CAPTIONS
- All people depicted must look Nigerian with authentic Nigerian features and characteristics`;

    // Generate image using OpenAI
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    });

    // Extract image data from response
    if (!result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Use base64 if available, otherwise fall back to URL
    const imageData = result.data[0];
    let imageUrl: string;

    if (imageData.b64_json) {
      // Convert base64 to data URL
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else if (imageData.url) {
      // Use URL directly
      imageUrl = imageData.url;
    } else {
      return NextResponse.json(
        { error: 'No image data found in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      goals: validGoals,
      
    });
  } catch (error: any) {
    // Log full error details
    console.error('Error in OpenAI API route:', {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      error: error?.error,
      stack: error?.stack,
    });
    
    // Handle organization verification error
    if (error?.status === 403 && error?.message?.includes('organization must be verified')) {
      return NextResponse.json(
        { 
          error: 'Organization verification required',
          details: error?.message || 'Your organization must be verified to use this model.',
          suggestion: 'Please go to https://platform.openai.com/settings/organization/general and click on Verify Organization. If you just verified, it can take up to 15 minutes for access to propagate.',
          fullError: process.env.NODE_ENV === 'development' ? error?.message : undefined
        },
        { status: 403 }
      );
    }
    
    // Provide more specific error messages
    if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'API quota exceeded',
          details: error?.message || 'Rate limit exceeded. Please try again later.',
          suggestion: 'You may need to wait a moment before trying again or check your OpenAI API usage.',
          fullError: process.env.NODE_ENV === 'development' ? error?.message : undefined
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate vision board image',
        details: error?.message || 'Unknown error occurred',
        fullError: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

