// We need to use a direct implementation for Vercel serverless functions
import { OpenAI } from 'openai';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format. URL must start with http:// or https://' });
    }

    // Analyze the website
    const analysis = await analyzeWebsite(url);
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to analyze website'
    });
  }
}

// Main analysis function
async function analyzeWebsite(url) {
  console.log(`Starting analysis for ${url}`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Get page title
    const title = await page.title();
    
    // Auto-scroll to load lazy content
    await autoScroll(page);
    
    // Take screenshot
    const screenshot = await page.screenshot({ encoding: 'base64' });
    
    // Extract links
    const allLinks = await extractLinks(page, url);
    
    // Extract assets
    const assets = await extractAssets(page, url);
    
    // Extract content
    const content = await extractContent(page);
    
    // Extract links with location data
    const links = await extractLinksWithLocation(page, url);
    
    // Analyze the main page
    const mainPageAnalysis = {
      url,
      title,
      analysis: await analyzePageContent(page, content, assets),
      screenshot: `data:image/png;base64,${screenshot}`,
      content,
      assets,
      links
    };
    
    // Create the full analysis object
    const fullAnalysis = {
      mainPage: mainPageAnalysis,
      additionalPages: [],
      allLinks
    };
    
    await browser.close();
    return fullAnalysis;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Helper function to auto-scroll a page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Helper function to extract links from a page
async function extractLinks(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links
      .map(link => {
        try {
          // Get absolute URL
          const url = new URL(link.href, baseUrl);
          // Only return links from the same domain
          if (url.hostname === new URL(baseUrl).hostname) {
            return url.href;
          }
        } catch (e) {
          // Invalid URL, skip
        }
        return null;
      })
      .filter(Boolean) // Remove null values
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  }, baseUrl);
}

// Helper function to extract links with location data
async function extractLinksWithLocation(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links
      .map(link => {
        try {
          // Get absolute URL
          const url = new URL(link.href, baseUrl);
          // Only return links from the same domain
          if (url.hostname === new URL(baseUrl).hostname) {
            return {
              url: url.href,
              text: link.textContent.trim(),
              location: {
                x: link.getBoundingClientRect().x,
                y: link.getBoundingClientRect().y,
                width: link.getBoundingClientRect().width,
                height: link.getBoundingClientRect().height
              }
            };
          }
        } catch (e) {
          // Invalid URL, skip
        }
        return null;
      })
      .filter(Boolean); // Remove null values
  }, baseUrl);
}

// Helper function to extract assets from a page
async function extractAssets(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    // Extract all images
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      type: 'image',
      src: img.src ? new URL(img.src, baseUrl).href : '',
      alt: img.alt || '',
      width: img.width || 0,
      height: img.height || 0,
      loading: img.loading || '',
      location: {
        x: img.getBoundingClientRect().x,
        y: img.getBoundingClientRect().y,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height
      }
    }));

    // Extract all stylesheets
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => ({
      type: 'stylesheet',
      href: link.href ? new URL(link.href, baseUrl).href : '',
      media: link.media || ''
    }));

    // Extract all scripts
    const scripts = Array.from(document.querySelectorAll('script')).map(script => ({
      type: 'script',
      src: script.src ? new URL(script.src, baseUrl).href : null,
      async: script.async || false,
      defer: script.defer || false
    }));

    // Extract all videos
    const videos = Array.from(document.querySelectorAll('video')).map(video => ({
      type: 'video',
      src: video.src ? new URL(video.src, baseUrl).href : null,
      poster: video.poster ? new URL(video.poster, baseUrl).href : null,
      width: video.width || 0,
      height: video.height || 0,
      autoplay: video.autoplay || false,
      controls: video.controls || false,
      location: {
        x: video.getBoundingClientRect().x,
        y: video.getBoundingClientRect().y,
        width: video.getBoundingClientRect().width,
        height: video.getBoundingClientRect().height
      }
    }));

    // Extract fonts
    const fonts = Array.from(document.querySelectorAll('link[rel="preload"][as="font"], link[rel="stylesheet"]'))
      .filter(link => link.href && link.href.match(/\.(woff2?|ttf|otf|eot)$/))
      .map(font => ({
        type: 'font',
        href: font.href ? new URL(font.href, baseUrl).href : '',
        format: font.href ? font.href.split('.').pop() : ''
      }));

    return {
      images,
      stylesheets,
      scripts,
      videos,
      fonts
    };
  }, baseUrl);
}

// Helper function to extract content from a page
async function extractContent(page) {
  return await page.evaluate(() => {
    // Extract metadata
    const metadata = {
      title: document.title || '',
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || ''
    };

    // Extract text content by sections
    const textContent = {
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        text: h.textContent.trim(),
        level: parseInt(h.tagName[1]),
        location: {
          x: h.getBoundingClientRect().x,
          y: h.getBoundingClientRect().y,
          width: h.getBoundingClientRect().width,
          height: h.getBoundingClientRect().height
        }
      })),
      paragraphs: Array.from(document.querySelectorAll('p')).map(p => ({
        text: p.textContent.trim(),
        location: {
          x: p.getBoundingClientRect().x,
          y: p.getBoundingClientRect().y,
          width: p.getBoundingClientRect().width,
          height: p.getBoundingClientRect().height
        }
      })),
      lists: Array.from(document.querySelectorAll('ul, ol')).map(list => ({
        items: Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim()),
        type: list.tagName.toLowerCase(),
        location: {
          x: list.getBoundingClientRect().x,
          y: list.getBoundingClientRect().y,
          width: list.getBoundingClientRect().width,
          height: list.getBoundingClientRect().height
        }
      }))
    };

    // Extract images
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src || '',
      alt: img.alt || '',
      location: {
        x: img.getBoundingClientRect().x,
        y: img.getBoundingClientRect().y,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height
      }
    }));

    // Extract buttons
    const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"], a.button')).map(btn => ({
      text: btn.textContent.trim(),
      location: {
        x: btn.getBoundingClientRect().x,
        y: btn.getBoundingClientRect().y,
        width: btn.getBoundingClientRect().width,
        height: btn.getBoundingClientRect().height
      }
    }));

    // Extract forms
    const forms = Array.from(document.querySelectorAll('form')).map(form => ({
      inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        placeholder: input.placeholder || '',
        required: input.required || false,
        location: {
          x: input.getBoundingClientRect().x,
          y: input.getBoundingClientRect().y,
          width: input.getBoundingClientRect().width,
          height: input.getBoundingClientRect().height
        }
      })),
      location: {
        x: form.getBoundingClientRect().x,
        y: form.getBoundingClientRect().y,
        width: form.getBoundingClientRect().width,
        height: form.getBoundingClientRect().height
      }
    }));

    // Extract navigation
    const navigation = Array.from(document.querySelectorAll('nav, [role="navigation"]')).map(nav => ({
      items: Array.from(nav.querySelectorAll('a')).map(link => ({
        text: link.textContent.trim(),
        url: link.href || '',
        location: {
          x: link.getBoundingClientRect().x,
          y: link.getBoundingClientRect().y,
          width: link.getBoundingClientRect().width,
          height: link.getBoundingClientRect().height
        }
      })),
      location: {
        x: nav.getBoundingClientRect().x,
        y: nav.getBoundingClientRect().y,
        width: nav.getBoundingClientRect().width,
        height: nav.getBoundingClientRect().height
      }
    }));

    // Extract footer
    const footer = document.querySelector('footer');
    const footerContent = footer ? {
      text: footer.textContent.trim(),
      links: Array.from(footer.querySelectorAll('a')).map(link => ({
        text: link.textContent.trim(),
        url: link.href || '',
        location: {
          x: link.getBoundingClientRect().x,
          y: link.getBoundingClientRect().y,
          width: link.getBoundingClientRect().width,
          height: link.getBoundingClientRect().height
        }
      })),
      location: {
        x: footer.getBoundingClientRect().x,
        y: footer.getBoundingClientRect().y,
        width: footer.getBoundingClientRect().width,
        height: footer.getBoundingClientRect().height
      }
    } : null;

    return {
      textContent,
      images,
      buttons,
      forms,
      navigation,
      footerContent,
      metadata
    };
  });
}

// Function to analyze page content using OpenAI
async function analyzePageContent(page, content, assets) {
  // Create a simplified version of the content for the AI
  const simplifiedContent = {
    title: content.metadata?.title || '',
    headings: content.textContent?.headings?.map(h => ({ text: h.text, level: h.level })) || [],
    paragraphs: content.textContent?.paragraphs?.map(p => p.text) || [],
    lists: content.textContent?.lists?.map(l => ({ items: l.items, type: l.type })) || [],
    buttons: content.buttons?.map(b => b.text) || [],
    images: assets.images.map(img => ({ src: img.src, alt: img.alt })),
    navigation: content.navigation?.map(nav => nav.items.map(item => ({ text: item.text, url: item.url }))) || []
  };

  // Default analysis structure
  const defaultAnalysis = {
    visual: {
      exitPoints: [],
      designIssues: [],
      recommendations: []
    },
    assets: {
      performanceIssues: [],
      accessibilityIssues: [],
      seoIssues: [],
      bestPractices: [],
      recommendations: []
    },
    content: {
      structureIssues: [],
      qualityIssues: [],
      seoIssues: [],
      uxIssues: [],
      recommendations: []
    }
  };

  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using default analysis');
      return generateDefaultAnalysis(content, assets);
    }

    // Analyze with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a website analysis expert. Analyze the provided website content and assets to identify issues and provide recommendations. Focus on visual design, assets (images, scripts, etc.), and content quality. Format your response as a JSON object with the following structure:
          {
            "visual": {
              "exitPoints": ["list of potential exit points"],
              "designIssues": ["list of design issues"],
              "recommendations": ["list of recommendations"]
            },
            "assets": {
              "performanceIssues": ["list of performance issues"],
              "accessibilityIssues": ["list of accessibility issues"],
              "seoIssues": ["list of SEO issues"],
              "bestPractices": ["list of best practices"],
              "recommendations": ["list of recommendations"]
            },
            "content": {
              "structureIssues": ["list of structure issues"],
              "qualityIssues": ["list of quality issues"],
              "seoIssues": ["list of SEO issues"],
              "uxIssues": ["list of UX issues"],
              "recommendations": ["list of recommendations"]
            }
          }
          
          Keep each list item concise (under 100 characters) and actionable. Limit each list to 5 items maximum.`
        },
        {
          role: "user",
          content: `Analyze this website content: ${JSON.stringify(simplifiedContent)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const analysisText = completion.choices[0].message.content;
    const analysis = JSON.parse(analysisText);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    return generateDefaultAnalysis(content, assets);
  }
}

// Generate a default analysis when OpenAI is not available
function generateDefaultAnalysis(content, assets) {
  const analysis = {
    visual: {
      exitPoints: [],
      designIssues: [],
      recommendations: []
    },
    assets: {
      performanceIssues: [],
      accessibilityIssues: [],
      seoIssues: [],
      bestPractices: [],
      recommendations: []
    },
    content: {
      structureIssues: [],
      qualityIssues: [],
      seoIssues: [],
      uxIssues: [],
      recommendations: []
    }
  };

  // Check for missing alt text
  const imagesWithoutAlt = assets.images.filter(img => !img.alt || img.alt.trim() === '');
  if (imagesWithoutAlt.length > 0) {
    analysis.assets.accessibilityIssues.push(`${imagesWithoutAlt.length} images missing alt text`);
    analysis.assets.recommendations.push('Add descriptive alt text to all images');
  }

  // Check for large images
  const largeImages = assets.images.filter(img => img.width > 1000 || img.height > 1000);
  if (largeImages.length > 0) {
    analysis.assets.performanceIssues.push(`${largeImages.length} large images may slow down page load`);
    analysis.assets.recommendations.push('Optimize and resize large images');
  }

  // Check for heading structure
  const headings = content.textContent?.headings || [];
  if (headings.length === 0) {
    analysis.content.structureIssues.push('No headings found on the page');
    analysis.content.recommendations.push('Add proper heading structure (H1, H2, etc.)');
  } else {
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      analysis.content.structureIssues.push('No H1 heading found');
      analysis.content.recommendations.push('Add a single H1 heading as the main title');
    } else if (h1Count > 1) {
      analysis.content.structureIssues.push(`Multiple H1 headings (${h1Count}) found`);
      analysis.content.recommendations.push('Use only one H1 heading per page');
    }
  }

  // Check for meta description
  if (!content.metadata?.description || content.metadata.description.trim() === '') {
    analysis.content.seoIssues.push('Missing meta description');
    analysis.content.recommendations.push('Add a descriptive meta description');
  }

  // Check for short content
  const paragraphs = content.textContent?.paragraphs || [];
  if (paragraphs.length < 3) {
    analysis.content.qualityIssues.push('Limited text content found');
    analysis.content.recommendations.push('Add more descriptive text content');
  }

  return analysis;
} 