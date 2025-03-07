import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// OpenAI API endpoint
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { issue } = req.body;
    
    if (!issue) {
      return res.status(400).json({ error: 'Issue is required' });
    }

    // Check if API key is available
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return res.status(200).json({ 
        solution: generateFallbackSolution(issue)
      });
    }
    
    // Categorize the issue
    const category = categorizeIssue(issue);
    
    // Get the appropriate system prompt
    const systemPrompt = getSystemPromptForCategory(category);
    
    // Make a request to the OpenAI API
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Provide a personalized solution for this website issue: "${issue}". Include specific code examples and best practices. Format your response with markdown for code blocks.`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const solution = data.choices[0].message.content.trim();
    
    console.log(`Generated AI solution for issue: "${issue.substring(0, 50)}..."`);
    
    return res.status(200).json({ solution });
  } catch (error) {
    console.error('Error generating AI solution:', error);
    
    // Provide a fallback solution if there's an error
    return res.status(200).json({ 
      solution: generateFallbackSolution(req.body.issue)
    });
  }
}

/**
 * Categorizes an issue based on its content
 */
function categorizeIssue(issue) {
  const issueLower = issue.toLowerCase();
  
  if (issueLower.includes('image') && (issueLower.includes('alt') || issueLower.includes('accessibility'))) {
    return 'accessibility';
  }
  
  if (issueLower.includes('contrast') || issueLower.includes('color') || issueLower.includes('readability')) {
    return 'contrast';
  }
  
  if (issueLower.includes('responsive') || issueLower.includes('mobile') || issueLower.includes('screen size')) {
    return 'responsive';
  }
  
  if (issueLower.includes('load') || issueLower.includes('performance') || issueLower.includes('speed')) {
    return 'performance';
  }
  
  if (issueLower.includes('seo') || issueLower.includes('meta') || issueLower.includes('search engine')) {
    return 'seo';
  }
  
  if (issueLower.includes('font') || issueLower.includes('typography') || issueLower.includes('text')) {
    return 'typography';
  }
  
  if (issueLower.includes('navigation') || issueLower.includes('menu') || issueLower.includes('link')) {
    return 'navigation';
  }
  
  if (issueLower.includes('content') || issueLower.includes('writing') || issueLower.includes('copy')) {
    return 'content';
  }
  
  if (issueLower.includes('security') || issueLower.includes('privacy') || issueLower.includes('data')) {
    return 'security';
  }
  
  if (issueLower.includes('form') || issueLower.includes('input') || issueLower.includes('validation')) {
    return 'forms';
  }
  
  return 'general';
}

/**
 * Gets a system prompt for a specific category
 */
function getSystemPromptForCategory(category) {
  const prompts = {
    accessibility: 'You are an accessibility expert specializing in web development. Provide specific, actionable solutions to fix website accessibility issues. Include code examples, WCAG guidelines references, and best practices. Focus on creating inclusive experiences for users with disabilities.',
    
    contrast: 'You are a UI/UX designer specializing in color theory and visual accessibility. Provide specific solutions for contrast and color issues on websites. Include color ratio recommendations, tools for checking contrast, and code examples using accessible color combinations.',
    
    responsive: 'You are a responsive design expert. Provide detailed solutions for making websites work well on all device sizes. Include CSS media query examples, responsive design patterns, and testing methodologies. Focus on mobile-first approaches and fluid layouts.',
    
    performance: 'You are a web performance optimization specialist. Provide technical solutions for improving website loading speed and performance. Include specific code optimizations, caching strategies, and resource loading techniques. Mention relevant tools for measuring and monitoring performance.',
    
    seo: 'You are an SEO specialist. Provide detailed solutions for improving website search engine optimization. Include specific meta tag recommendations, structured data examples, and content optimization techniques. Focus on both technical SEO and content-related improvements.',
    
    typography: 'You are a typography and web design expert. Provide solutions for improving text readability and visual hierarchy. Include CSS examples, font pairing recommendations, and best practices for line height, spacing, and font sizes. Focus on both aesthetics and readability.',
    
    navigation: 'You are a UX designer specializing in website navigation and information architecture. Provide solutions for improving site navigation, menu structures, and user flows. Include accessibility considerations, mobile navigation patterns, and best practices for link design.',
    
    content: 'You are a content strategist and UX writer. Provide solutions for improving website content quality, structure, and effectiveness. Include writing guidelines, content organization strategies, and techniques for improving readability and engagement.',
    
    security: 'You are a web security expert. Provide solutions for improving website security and data protection. Include specific code examples, security headers, form validation techniques, and best practices for protecting user data.',
    
    forms: 'You are a UX designer specializing in form design and validation. Provide solutions for improving form usability, accessibility, and conversion rates. Include validation techniques, error handling best practices, and code examples for creating user-friendly forms.',
    
    general: 'You are a helpful web development and design expert. Provide specific, actionable solutions to fix website issues. Format your response with clear steps, examples, and best practices. Keep your response concise but comprehensive.'
  };
  
  return prompts[category] || prompts.general;
}

/**
 * Generates a fallback solution when AI is unavailable
 */
function generateFallbackSolution(issue) {
  // Common solutions for different types of issues
  const issueLower = issue.toLowerCase();
  
  if (issueLower.includes('image') && issueLower.includes('alt')) {
    return 'Add descriptive alt text to all images to improve accessibility.\n\nExample:\n<img src="image.jpg" alt="Descriptive text about the image content" />\n\nGood alt text should:\n- Be concise but descriptive\n- Convey the purpose of the image\n- Not start with "image of" or "picture of"';
  }
  
  if (issueLower.includes('contrast')) {
    return 'Improve color contrast between text and background to meet WCAG standards (minimum 4.5:1 for normal text, 3:1 for large text).\n\nSteps to fix:\n1. Use a contrast checker tool like WebAIM\n2. Adjust text or background colors\n3. Consider adding a semi-transparent background behind text on images';
  }
  
  if (issueLower.includes('responsive') || issueLower.includes('mobile')) {
    return 'Make your design responsive for all device sizes:\n\n1. Use responsive units (%, em, rem) instead of fixed pixels\n2. Implement media queries for different breakpoints\n3. Test on various devices and screen sizes\n4. Consider a mobile-first approach to design';
  }
  
  if (issueLower.includes('load') || issueLower.includes('performance')) {
    return 'Improve page load performance:\n\n1. Optimize and compress images\n2. Minify CSS and JavaScript\n3. Implement lazy loading for images and videos\n4. Use a Content Delivery Network (CDN)\n5. Enable browser caching\n6. Reduce third-party scripts';
  }
  
  if (issueLower.includes('seo') || issueLower.includes('meta')) {
    return 'Improve SEO with these steps:\n\n1. Add descriptive title tags (50-60 characters)\n2. Write compelling meta descriptions (150-160 characters)\n3. Use proper heading structure (H1, H2, etc.)\n4. Add structured data/schema markup\n5. Ensure mobile-friendliness\n6. Improve page load speed';
  }
  
  // Default solution for other issues
  return `To fix this issue, consider the following steps:

1. Analyze the specific problem mentioned
2. Research best practices for this particular area
3. Implement changes incrementally and test results
4. Get feedback from users or colleagues
5. Continue to monitor and refine your solution`;
} 