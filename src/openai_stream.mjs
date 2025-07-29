import OpenAI from 'openai';
import { recordAudio } from 'openai/helpers/audio';

const openai = new OpenAI();

async function streamTranscription() {
  console.log('Recording... Press Ctrl+C to stop.');
  while (true) {
    try {
      const audio = await recordAudio({ timeout: 2000 });
      const result = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audio,
      });
      console.log(result.text.trim());
    } catch (err) {
      console.error('Transcription error:', err);
      break;
    }
  }
}

streamTranscription();
