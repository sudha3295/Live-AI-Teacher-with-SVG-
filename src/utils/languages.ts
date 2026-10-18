import { KidLanguageOption } from '../types';

export const AOA_LANGUAGES: KidLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'South Asia' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'South Asia' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'South Asia' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'South Asia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'South Asia' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'South Asia' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'South Asia' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳', region: 'East Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'East Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'East Asia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Southeast Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'Southeast Asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Southeast Asia' },
];

export const DEFAULT_LANGUAGES = ['English', 'Tamil'];
