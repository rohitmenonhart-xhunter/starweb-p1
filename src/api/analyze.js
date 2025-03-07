import { OpenAI } from 'openai';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { URL } from 'url';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// Helper function to extract assets from a page
async function extractAssets(page, baseUrl) {
  return await page.evaluate((baseUrl) => {
    // Extract all images
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      type: 'image',
      src: new URL(img.src, baseUrl).href,
      alt: img.alt,
      width: img.width,
      height: img.height,
      loading: img.loading,
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
      href: new URL(link.href, baseUrl).href,
      media: link.media
    }));

    // Extract all scripts
    const scripts = Array.from(document.querySelectorAll('script')).map(script => ({
      type: 'script',
      src: script.src ? new URL(script.src, baseUrl).href : null,
      async: script.async,
      defer: script.defer,
      type: script.type
    }));

    // Extract all videos
    const videos = Array.from(document.querySelectorAll('video')).map(video => ({
      type: 'video',
      src: video.src ? new URL(video.src, baseUrl).href : null,
      poster: video.poster ? new URL(video.poster, baseUrl).href : null,
      width: video.width,
      height: video.height,
      autoplay: video.autoplay,
      controls: video.controls,
      location: {
        x: video.getBoundingClientRect().x,
        y: video.getBoundingClientRect().y,
        width: video.getBoundingClientRect().width,
        height: video.getBoundingClientRect().height
      }
    }));

    // Extract fonts
    const fonts = Array.from(document.querySelectorAll('link[rel="preload"][as="font"], link[rel="stylesheet"]'))
      .filter(link => link.href.match(/\.(woff2?|ttf|otf|eot)$/))
      .map(font => ({
        type: 'font',
        href: new URL(font.href, baseUrl).href,
        format: font.href.split('.').pop()
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
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      keywords: document.querySelector('meta[name="keywords"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      ogDescription: document.querySelector('meta[property="og:description"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content
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

    // Extract interactive elements
    const interactiveElements = {
      buttons: Array.from(document.querySelectorAll('button, .btn, [role="button"], a.button')).map(btn => ({
        text: btn.textContent.trim(),
        type: btn.type || 'button',
        disabled: btn.disabled,
        location: {
          x: btn.getBoundingClientRect().x,
          y: btn.getBoundingClientRect().y,
          width: btn.getBoundingClientRect().width,
          height: btn.getBoundingClientRect().height
        }
      })),
      forms: Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          placeholder: input.placeholder,
          required: input.required,
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
      }))
    };

    // Extract navigation and footer
    const navigation = Array.from(document.querySelectorAll('nav, [role="navigation"]')).map(nav => ({
      items: Array.from(nav.querySelectorAll('a')).map(link => ({
        text: link.textContent.trim(),
        href: link.href,
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

    const footer = document.querySelector('footer');
    const footerContent = footer ? {
      text: footer.textContent.trim(),
      links: Array.from(footer.querySelectorAll('a')).map(link => ({
        text: link.textContent.trim(),
        href: link.href,
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
      metadata,
      textContent,
      interactiveElements,
      navigation,
      footerContent
    };
  });
}

// Helper function to analyze assets with OpenAI
async function analyzeAssetsWithAI(assets, pageTitle, pageUrl) {
  try {
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze the assets of the page titled "${pageTitle}" (URL: ${pageUrl}).

Asset Statistics:
- Images: ${assets.images.length} images
- Stylesheets: ${assets.stylesheets.length} CSS files
- Scripts: ${assets.scripts.length} JavaScript files
- Videos: ${assets.videos.length} videos
- Fonts: ${assets.fonts.length} font files

Please analyze these assets and provide insights in the following sections:
Performance Issues:
Accessibility Issues:
SEO Issues:
Best Practices:
Recommendations:`
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const response_text = analysis.choices[0].message.content || '';
    
    // Parse sections using regex
    const sections = {
      performanceIssues: (response_text.match(/Performance Issues:(.*?)(?=Accessibility Issues:|$)/s) || [])[1],
      accessibilityIssues: (response_text.match(/Accessibility Issues:(.*?)(?=SEO Issues:|$)/s) || [])[1],
      seoIssues: (response_text.match(/SEO Issues:(.*?)(?=Best Practices:|$)/s) || [])[1],
      bestPractices: (response_text.match(/Best Practices:(.*?)(?=Recommendations:|$)/s) || [])[1],
      recommendations: (response_text.match(/Recommendations:(.*?)$/s) || [])[1]
    };

    // Process each section into an array of points
    return {
      performanceIssues: sections.performanceIssues
        ? sections.performanceIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      accessibilityIssues: sections.accessibilityIssues
        ? sections.accessibilityIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      seoIssues: sections.seoIssues
        ? sections.seoIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      bestPractices: sections.bestPractices
        ? sections.bestPractices.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      recommendations: sections.recommendations
        ? sections.recommendations.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : []
    };
  } catch (error) {
    console.error('AI assets analysis error:', error);
    return {
      performanceIssues: ['Error analyzing assets with AI'],
      accessibilityIssues: [],
      seoIssues: [],
      bestPractices: [],
      recommendations: []
    };
  }
}

// Helper function to analyze content with OpenAI
async function analyzeContentWithAI(content, pageTitle, pageUrl) {
  try {
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze the content of the page titled "${pageTitle}" (URL: ${pageUrl}).

Content Statistics:
- Headings: ${content.textContent.headings.length} headings
- Paragraphs: ${content.textContent.paragraphs.length} paragraphs
- Lists: ${content.textContent.lists.length} lists
- Buttons: ${content.interactiveElements.buttons.length} buttons
- Forms: ${content.interactiveElements.forms.length} forms
- Navigation Menus: ${content.navigation.length} menus

Metadata:
${Object.entries(content.metadata).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Please analyze this content and provide insights in the following sections:
Content Structure Issues:
Content Quality Issues:
SEO Content Issues:
UX/UI Issues:
Recommendations:`
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const response_text = analysis.choices[0].message.content || '';
    
    // Parse sections using regex
    const sections = {
      structureIssues: (response_text.match(/Content Structure Issues:(.*?)(?=Content Quality Issues:|$)/s) || [])[1],
      qualityIssues: (response_text.match(/Content Quality Issues:(.*?)(?=SEO Content Issues:|$)/s) || [])[1],
      seoIssues: (response_text.match(/SEO Content Issues:(.*?)(?=UX\/UI Issues:|$)/s) || [])[1],
      uxIssues: (response_text.match(/UX\/UI Issues:(.*?)(?=Recommendations:|$)/s) || [])[1],
      recommendations: (response_text.match(/Recommendations:(.*?)$/s) || [])[1]
    };

    // Process each section into an array of points
    return {
      structureIssues: sections.structureIssues
        ? sections.structureIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      qualityIssues: sections.qualityIssues
        ? sections.qualityIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      seoIssues: sections.seoIssues
        ? sections.seoIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      uxIssues: sections.uxIssues
        ? sections.uxIssues.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      recommendations: sections.recommendations
        ? sections.recommendations.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : []
    };
  } catch (error) {
    console.error('AI content analysis error:', error);
    return {
      structureIssues: ['Error analyzing content with AI'],
      qualityIssues: [],
      seoIssues: [],
      uxIssues: [],
      recommendations: []
    };
  }
}

// Helper function to analyze a page with OpenAI
async function analyzePageWithAI(pageData) {
  try {
    const analysis = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this screenshot of the page titled "${pageData.title}" (URL: ${pageData.url}). Identify potential user exit points, design issues, and provide recommendations for improvement. Format your response with clear sections: Exit Points:, Design Issues:, and Recommendations:`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${pageData.screenshot}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const response_text = analysis.choices[0].message.content || '';
    
    // Parse sections using regex
    const sections = {
      exitPoints: (response_text.match(/Exit Points:(.*?)(?=Design Issues:|$)/s) || [])[1],
      designIssues: (response_text.match(/Design Issues:(.*?)(?=Recommendations:|$)/s) || [])[1],
      recommendations: (response_text.match(/Recommendations:(.*?)$/s) || [])[1]
    };

    // Process each section into an array of points
    return {
      exitPoints: sections.exitPoints
        ? sections.exitPoints.split('\n')
            .map(point => point.trim())
            .filter(point => point && !point.match(/^[-•*]/))
            .map(point => point.replace(/^[0-9]+\.\s*/, ''))
        : [],
      designIssues: sections.designIssues
        ? sections.designIssues.split('\n')
            .map(issue => issue.trim())
            .filter(issue => issue && !issue.match(/^[-•*]/))
            .map(issue => issue.replace(/^[0-9]+\.\s*/, ''))
        : [],
      recommendations: sections.recommendations
        ? sections.recommendations.split('\n')
            .map(rec => rec.trim())
            .filter(rec => rec && !rec.match(/^[-•*]/))
            .map(rec => rec.replace(/^[0-9]+\.\s*/, ''))
        : []
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      exitPoints: ['Error analyzing page with AI'],
      designIssues: [],
      recommendations: []
    };
  }
}

export default async function analyze(url) {
  let browser;
  try {
    // Launch browser and navigate to URL
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the main URL
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
    }

    // Auto-scroll the page
    await autoScroll(page);
    
    // Take full page screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });

    // Extract links, assets, and content
    const links = await extractLinks(page, url);
    const assets = await extractAssets(page, url);
    const content = await extractContent(page);
    const pageTitle = await page.title();

    // Analyze assets and content separately
    const assetsAnalysis = await analyzeAssetsWithAI(assets, pageTitle, url);
    const contentAnalysis = await analyzeContentWithAI(content, pageTitle, url);

    // Analyze visual design with OpenAI
    const visualAnalysis = await analyzePageWithAI({
      title: pageTitle,
      url: url,
      screenshot: screenshot.toString('base64')
    });

    // Return combined results
    return {
      mainPage: {
        url: url,
        title: pageTitle,
        screenshot: screenshot.toString('base64'),
        content: content,
        assets: assets,
        analysis: {
          visual: visualAnalysis,
          assets: assetsAnalysis,
          content: contentAnalysis
        }
      },
      allLinks: links
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error(error.message || 'Failed to analyze website');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 