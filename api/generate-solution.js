import { generateAISolution } from '../src/api/openai.ts';

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

    // Generate the solution using the OpenAI API
    const solution = await generateAISolution(issue);
    
    return res.status(200).json({ solution });
  } catch (error) {
    console.error('Error generating AI solution:', error);
    
    // Provide a fallback solution if there's an error
    return res.status(200).json({ 
      solution: `To fix this issue "${issue}", consider the following steps:

1. Analyze the specific problem mentioned
2. Research best practices for this particular area
3. Implement changes incrementally and test results
4. Get feedback from users or colleagues
5. Continue to monitor and refine your solution

For more specific guidance, consider consulting with a specialist in this area or researching industry standards.`
    });
  }
} 