import html2pdf from 'html2pdf.js';
import { FullAnalysis } from '../types/index';

/**
 * Generates a PDF report from the analysis data
 * @param analysis The full analysis data
 * @param filename The name of the PDF file to download
 */
export const generateAnalysisPDF = (analysis: FullAnalysis, filename = 'website-analysis-report.pdf'): void => {
  // Create a container for the PDF content
  const reportContainer = document.createElement('div');
  reportContainer.className = 'pdf-report';
  reportContainer.style.padding = '20px';
  reportContainer.style.fontFamily = 'Arial, sans-serif';
  reportContainer.style.color = '#333';
  
  // Add report header
  const header = document.createElement('div');
  header.innerHTML = `
    <h1 style="color: #4B0082; text-align: center; margin-bottom: 10px;">Website Analysis Report</h1>
    <h2 style="color: #800080; text-align: center; margin-bottom: 20px;">${analysis.mainPage.url}</h2>
    <p style="text-align: center; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <hr style="border: 1px solid #eee; margin-bottom: 30px;">
  `;
  reportContainer.appendChild(header);
  
  // Add screenshot section
  const screenshotSection = document.createElement('div');
  screenshotSection.innerHTML = `
    <h2 style="color: #4B0082; margin-bottom: 15px;">Website Screenshot</h2>
    <div style="text-align: center; margin-bottom: 30px;">
      <img 
        src="data:image/png;base64,${analysis.mainPage.screenshot}" 
        alt="Screenshot of ${analysis.mainPage.title}" 
        style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px;"
      />
    </div>
    <hr style="border: 1px solid #eee; margin-bottom: 30px;">
  `;
  reportContainer.appendChild(screenshotSection);
  
  // Add visual analysis section
  const visualSection = document.createElement('div');
  visualSection.innerHTML = `
    <h2 style="color: #4B0082; margin-bottom: 15px;">Visual Analysis</h2>
    
    <h3 style="color: #FF0000; margin-bottom: 10px;">Exit Points</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.visual.exitPoints.map((point: string) => 
        `<li style="margin-bottom: 8px;">${point}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #FFA500; margin-bottom: 10px;">Design Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.visual.designIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #008000; margin-bottom: 10px;">Recommendations</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.visual.recommendations.map((rec: string) => 
        `<li style="margin-bottom: 8px;">${rec}</li>`
      ).join('')}
    </ul>
    
    <hr style="border: 1px solid #eee; margin-bottom: 30px;">
  `;
  reportContainer.appendChild(visualSection);
  
  // Add assets analysis section
  const assetsSection = document.createElement('div');
  assetsSection.innerHTML = `
    <h2 style="color: #4B0082; margin-bottom: 15px;">Assets Analysis</h2>
    
    <h3 style="color: #FF6347; margin-bottom: 10px;">Performance Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.assets.performanceIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #4682B4; margin-bottom: 10px;">Accessibility Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.assets.accessibilityIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #9370DB; margin-bottom: 10px;">SEO Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.assets.seoIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #20B2AA; margin-bottom: 10px;">Best Practices</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.assets.bestPractices.map((practice: string) => 
        `<li style="margin-bottom: 8px;">${practice}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #008000; margin-bottom: 10px;">Recommendations</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.assets.recommendations.map((rec: string) => 
        `<li style="margin-bottom: 8px;">${rec}</li>`
      ).join('')}
    </ul>
    
    <hr style="border: 1px solid #eee; margin-bottom: 30px;">
  `;
  reportContainer.appendChild(assetsSection);
  
  // Add content analysis section
  const contentSection = document.createElement('div');
  contentSection.innerHTML = `
    <h2 style="color: #4B0082; margin-bottom: 15px;">Content Analysis</h2>
    
    <h3 style="color: #FF6347; margin-bottom: 10px;">Structure Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.content.structureIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #4682B4; margin-bottom: 10px;">Quality Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.content.qualityIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #9370DB; margin-bottom: 10px;">SEO Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.content.seoIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #20B2AA; margin-bottom: 10px;">UX Issues</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.content.uxIssues.map((issue: string) => 
        `<li style="margin-bottom: 8px;">${issue}</li>`
      ).join('')}
    </ul>
    
    <h3 style="color: #008000; margin-bottom: 10px;">Recommendations</h3>
    <ul style="margin-bottom: 20px;">
      ${analysis.mainPage.analysis.content.recommendations.map((rec: string) => 
        `<li style="margin-bottom: 8px;">${rec}</li>`
      ).join('')}
    </ul>
  `;
  reportContainer.appendChild(contentSection);
  
  // Add footer
  const footer = document.createElement('div');
  footer.innerHTML = `
    <hr style="border: 1px solid #eee; margin-top: 30px; margin-bottom: 20px;">
    <p style="text-align: center; color: #666; font-size: 12px;">
      Generated by StarWeb Analysis Tool
    </p>
  `;
  reportContainer.appendChild(footer);
  
  // Temporarily append to document to render (will be removed after PDF generation)
  document.body.appendChild(reportContainer);
  
  // Configure PDF options
  const options = {
    margin: [10, 10] as [number, number],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
  };
  
  // Generate and download PDF
  html2pdf().from(reportContainer).set(options).save().then(() => {
    // Remove the temporary container after PDF generation
    document.body.removeChild(reportContainer);
  });
}; 