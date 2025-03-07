import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { FullAnalysis } from '../types/index';

/**
 * Generates a Word document report from the analysis data
 * @param analysis The full analysis data
 * @param filename The name of the Word file to download
 */
export const generateAnalysisWord = async (analysis: FullAnalysis, filename = 'website-analysis-report.docx'): Promise<void> => {
  // Create a new document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: "Website Analysis Report",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        // Website URL
        new Paragraph({
          text: analysis.mainPage.url,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        // Date
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // Divider
        new Paragraph({
          border: {
            bottom: { color: "#CCCCCC", style: BorderStyle.SINGLE, size: 1 }
          },
          spacing: { after: 400 }
        }),
        
        // Visual Analysis Section
        new Paragraph({
          text: "Visual Analysis",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        // Exit Points
        new Paragraph({
          text: "Exit Points",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.visual.exitPoints.map(point => 
          new Paragraph({
            text: `• ${point}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Design Issues
        new Paragraph({
          text: "Design Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.visual.designIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Recommendations
        new Paragraph({
          text: "Recommendations",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.visual.recommendations.map(rec => 
          new Paragraph({
            text: `• ${rec}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Divider
        new Paragraph({
          border: {
            bottom: { color: "#CCCCCC", style: BorderStyle.SINGLE, size: 1 }
          },
          spacing: { before: 200, after: 400 }
        }),
        
        // Assets Analysis Section
        new Paragraph({
          text: "Assets Analysis",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        // Performance Issues
        new Paragraph({
          text: "Performance Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.assets.performanceIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Accessibility Issues
        new Paragraph({
          text: "Accessibility Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.assets.accessibilityIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // SEO Issues
        new Paragraph({
          text: "SEO Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.assets.seoIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Best Practices
        new Paragraph({
          text: "Best Practices",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.assets.bestPractices.map(practice => 
          new Paragraph({
            text: `• ${practice}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Recommendations
        new Paragraph({
          text: "Recommendations",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.assets.recommendations.map(rec => 
          new Paragraph({
            text: `• ${rec}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Divider
        new Paragraph({
          border: {
            bottom: { color: "#CCCCCC", style: BorderStyle.SINGLE, size: 1 }
          },
          spacing: { before: 200, after: 400 }
        }),
        
        // Content Analysis Section
        new Paragraph({
          text: "Content Analysis",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        // Structure Issues
        new Paragraph({
          text: "Structure Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.content.structureIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Quality Issues
        new Paragraph({
          text: "Quality Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.content.qualityIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // SEO Issues
        new Paragraph({
          text: "SEO Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.content.seoIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // UX Issues
        new Paragraph({
          text: "UX Issues",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.content.uxIssues.map(issue => 
          new Paragraph({
            text: `• ${issue}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Recommendations
        new Paragraph({
          text: "Recommendations",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        
        ...analysis.mainPage.analysis.content.recommendations.map(rec => 
          new Paragraph({
            text: `• ${rec}`,
            spacing: { before: 80, after: 80 }
          })
        ),
        
        // Footer
        new Paragraph({
          border: {
            top: { color: "#CCCCCC", style: BorderStyle.SINGLE, size: 1 }
          },
          spacing: { before: 400, after: 100 }
        }),
        
        new Paragraph({
          text: "Generated by StarWeb Analysis Tool",
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 }
        })
      ]
    }]
  });
  
  // Generate the document as a blob using browser-compatible method
  const blob = await Packer.toBlob(doc);
  
  // Save the document
  saveAs(blob, filename);
}; 