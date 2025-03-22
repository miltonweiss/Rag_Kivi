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
      const urlCheck = await fetch(audioUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Accept': '*/*'
        }
      });
      console.log('Audio URL verification completed');
    } catch (error) {
      console.error('Error accessing audio URL:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Wir werfen hier keinen Fehler, da die URL möglicherweise trotzdem von AssemblyAI zugegriffen werden kann
      console.warn('URL check failed, but continuing with transcription attempt');
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
      console.log('Sending transcription request to AssemblyAI:', {
        url: `${BASE_URL}/transcript`,
        audioUrl,
        headers: { ...headers, Authorization: 'REDACTED' }
      });
      
      // Use the raw URL directly without any encoding/decoding
      const requestBody = {
        audio_url: audioUrl, // Direkte Verwendung der Original-URL
        language_detection: true,
        punctuate: true,
        format_text: true
      };

      console.log('AssemblyAI request body:', requestBody);
      
      response = await fetch(`${BASE_URL}/transcript`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('AssemblyAI response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (fetchError) {
      console.error('Detailed network error during AssemblyAI request:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      });
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