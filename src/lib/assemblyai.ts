const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;
const BASE_URL = 'https://api.assemblyai.com/v2';

export async function transcribeAudio(audioUrl: string) {
  try {
    console.log('Starting transcription for URL:', audioUrl);

    if (!ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key is not configured');
    }

    // Validate the audio URL
    if (!audioUrl || !audioUrl.startsWith('https://')) {
      throw new Error('Invalid audio URL format. URL must be HTTPS.');
    }

    // Verify the URL is accessible
    try {
      const urlCheck = await fetch(audioUrl);
      if (!urlCheck.ok) {
        throw new Error(`Audio file not accessible: ${urlCheck.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to access audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create the headers object
    const headers = {
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    };

    console.log('Sending request to AssemblyAI with headers:', {
      ...headers,
      'Authorization': 'REDACTED'
    });

    // Submit the transcription request
    let response;
    try {
      response = await fetch(`${BASE_URL}/transcript`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          audio_url: audioUrl,
          auto_language_detection: true,
          auto_punctuation: true,
        }),
      });
    } catch (fetchError) {
      console.error('Network error during AssemblyAI request:', fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to AssemblyAI'}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AssemblyAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || 'Unknown error';
      } catch {
        errorMessage = errorText || response.statusText;
      }
      
      throw new Error(`AssemblyAI API error (${response.status}): ${errorMessage}`);
    }

    const initialData = await response.json();
    console.log('Initial transcription response:', initialData);
    
    if (!initialData.id) {
      throw new Error('Failed to start transcription: No transcription ID received');
    }

    // Poll for the transcription result
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes maximum (with 3-second intervals)

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling attempt ${attempts} for transcript ${initialData.id}`);

      let pollingResponse;
      try {
        pollingResponse = await fetch(
          `${BASE_URL}/transcript/${initialData.id}`,
          { headers }
        );
      } catch (pollError) {
        console.error('Network error during polling:', pollError);
        throw new Error(`Polling network error: ${pollError instanceof Error ? pollError.message : 'Failed to connect to AssemblyAI'}`);
      }

      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text();
        console.error('Polling error response:', {
          status: pollingResponse.status,
          statusText: pollingResponse.statusText,
          body: errorText
        });
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Unknown error';
        } catch {
          errorMessage = errorText || pollingResponse.statusText;
        }
        
        throw new Error(`Polling error (${pollingResponse.status}): ${errorMessage}`);
      }

      const transcriptionData = await pollingResponse.json();
      console.log('Polling response:', transcriptionData);

      if (transcriptionData.status === 'completed') {
        if (transcriptionData.language_code) {
          console.log('Detected language:', transcriptionData.language_code);
        }
        return transcriptionData;
      } else if (transcriptionData.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionData.error}`);
      } else if (transcriptionData.status === 'failed') {
        throw new Error(`Transcription failed: ${transcriptionData.error || 'Unknown error'}`);
      }

      // Wait for 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error('Transcription timed out after 3 minutes');
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
} 