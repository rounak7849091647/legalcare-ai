/**
 * Cleans text for natural voice output
 * Removes markdown, special symbols, and formats text for speech
 */
export const cleanTextForVoice = (text: string): string => {
  if (!text) return '';

  let cleaned = text
    // Remove markdown headers (## Header ##, ### Header, etc.)
    .replace(/#{1,6}\s*([^\n#]+)\s*#{0,6}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    
    // Remove bold/italic markdown
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // bold italic
    .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
    .replace(/\*(.+?)\*/g, '$1')         // italic
    .replace(/___(.+?)___/g, '$1')       // bold italic
    .replace(/__(.+?)__/g, '$1')         // bold
    .replace(/_(.+?)_/g, '$1')           // italic
    
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    
    // Remove image markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    
    // Remove bullet points and numbered lists formatting
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    
    // Remove blockquotes
    .replace(/^>\s*/gm, '')
    
    // Clean up special characters that don't speak well
    .replace(/[•◦▪▫●○]/g, '')
    .replace(/[→←↑↓↔]/g, '')
    .replace(/\|/g, '')
    
    // Clean up document formatting artifacts
    .replace(/\*{2,}/g, '')
    .replace(/_{2,}/g, '')
    
    // Remove emojis from voice (they don't speak well)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    
    // Trim
    .trim();

  return cleaned;
};

/**
 * Adds natural pauses and speech patterns for Indian languages
 */
export const addNaturalPauses = (text: string, language: string): string => {
  let enhanced = text;
  
  // Add slight pauses after key punctuation
  enhanced = enhanced
    .replace(/\./g, '... ')
    .replace(/,/g, ', ')
    .replace(/:/g, ': ')
    .replace(/;/g, '; ')
    .replace(/\?/g, '? ')
    .replace(/!/g, '! ');
  
  // For Hindi/Indian languages, ensure proper spacing
  if (['hi-IN', 'hinglish', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN'].includes(language)) {
    // Add slight pauses after Hindi punctuation
    enhanced = enhanced
      .replace(/।/g, '। ')  // Devanagari danda
      .replace(/॥/g, '॥ '); // Double danda
  }
  
  return enhanced;
};

/**
 * Full text processing for voice output
 */
export const prepareTextForVoice = (text: string, language: string = 'en-IN'): string => {
  const cleaned = cleanTextForVoice(text);
  return addNaturalPauses(cleaned, language);
};
