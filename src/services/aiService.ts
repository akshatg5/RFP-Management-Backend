import { GoogleGenerativeAI } from "@google/generative-ai";
import { StructuredRFP } from "../types/rfpTypes";
import { SYSTEM_PROMPT_PROMPT_TO_RFP } from "./systemPrompt";

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI API KEY IS MISSING");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });
  }

  // convert natural language procurement request into structured RFP
  async structuredRFPFromNaturalLanguage(
    prompt: string
  ): Promise<StructuredRFP> {
    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT_PROMPT_TO_RFP }],
          },
          {
            role: "user",
            parts: [
              {
                text: `Convert this procurement request into structured Request For proposal Data : \r\n ${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const response = await result.response;
      let text = response.text().trim();

      // Clean up response - remove markdown code blocks if present
      text = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const structuredData: StructuredRFP = JSON.parse(text);
      // validate the required fields
      // if (
      //   !structuredData.title ||
      //   structuredData.items ||
      //   !Array.isArray(structuredData.items)
      // ) {
      //   throw new Error("Invalid RFP structured data returned from AI");
      // }

      return structuredData;
    } catch (error: any) {
      console.error(
        "AI Service Error (Structure RFP : ",
        error.message || error
      );
      throw new Error(
        `Failed to structure RFP from natural language : ${error.message}`
      );
    }
  }

  // parse vendor email response and extract structured proposal Data
  async parseVendorProposal(
    emailBody: string,
    rfpData: StructuredRFP
  ): Promise<{
    extractedData: any;
    totalPrice?: number;
    deliveryDays?: number;
    paymentTerms?: string | string[];
    warranty?: string;
  }> {
    try {
      const SYSTEM_PROMPT_PARSE_VENDOR_PROPOSAL = `
You are an expert at parsing vendor proposals and extracting structured data.

Given an RFP and a vendor's email response, extract the following information:
- items: Array of quoted items with {name, quantity, unitPrice, totalPrice, specifications}
- totalPrice: Total quoted price (number only)
- deliveryDays: Proposed delivery timeline in days
- paymentTerms: Payment terms offered
- warranty: Warranty information
- additionalServices: Any additional services or benefits offered
- notes: Any important notes or conditions

The RFP requested:
${JSON.stringify(rfpData, null, 2)}

Respond ONLY with valid JSON. No markdown, no explanations.
`;

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT_PARSE_VENDOR_PROPOSAL }],
          },
          {
            role: "user",
            parts: [{ text: `Parse this vendor response : \n\n ${emailBody}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });

      const response = await result.response;
      let text = response.text().trim();

      // Clean up response
      text = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsedData = JSON.parse(text);

      return {
        extractedData: parsedData,
        totalPrice: parsedData.totalPrice,
        deliveryDays: parsedData.deliveryDays,
        paymentTerms: parsedData.paymentTerms,
        warranty: parsedData.warranty,
      };
    } catch (error: any) {
      console.error(
        "AI service Error (Parsing Proposal) :",
        error.message || error
      );
      throw new Error(`Failed to parse vendor propsal : ${error.message}`);
    }
  }

  // Score and evaluate a vendor proposal against RFP requirements
  async scoreProposal(
    rfpData: StructuredRFP,
    proposalData: any,
    vendorName: string
  ): Promise<{
    score: number;
    evaluation: string;
  }> {
    try {
      const SYSTEM_PROMPT_SCORE_PROPOSAL = `You are an expert procurement evaluator. Score vendor proposals on a scale of 0-100.

Evaluation criteria:
1. Price competitiveness (30 points) - Compare against budget
2. Delivery timeline (20 points) - Compare against required timeline
3. Completeness (20 points) - All items quoted
4. Terms and conditions (15 points) - Payment terms, warranty
5. Additional value (15 points) - Extra services, support

Provide:
- score: Number between 0-100
- evaluation: Detailed 2-3 sentence evaluation explaining the score

RFP Requirements:
${JSON.stringify(rfpData, null, 2)}

Vendor Proposal from ${vendorName}:
${JSON.stringify(proposalData, null, 2)}

Respond ONLY with valid JSON: {"score": <number>, "evaluation": "<string>"}`;

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT_SCORE_PROPOSAL }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });

      const response = await result.response;
      let text = response.text().trim();

      text = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const scoringData = JSON.parse(text);

      return {
        score: Math.min(100, Math.max(0, scoringData.score)),
        evaluation: scoringData.evaluation,
      };
    } catch (error: any) {
      console.error(
        "AI Service Error (scoreProposal):",
        error.message || error
      );
      throw new Error(`Failed to score proposal: ${error.message}`);
    }
  }

  // Compare multiple proposals and provide recommendation
  async compareProposalsAndRecommend(
    rfpData: StructuredRFP,
    proposals: Array<{
      vendorName: string;
      vendorId: string;
      extractedData: any;
      aiScore?: number;
      aiEvaluation?: string;
    }>
  ): Promise<{
    recommendedVendorId: string;
    reasoning: string;
    comparisonSummary: string;
  }> {
    try {
      const SYSTEM_PROMPT_COMPARE_PROPOSALS = `You are an expert procurement advisor. Compare vendor proposals and recommend the best option.

Consider:
- Overall value for money
- Delivery capability
- Terms and conditions
- Risk factors
- Scores and evaluations

Provide:
- recommendedVendorId: The vendor ID of your recommendation
- reasoning: 2-3 sentences explaining why this vendor is recommended
- comparisonSummary: 3-4 sentences comparing all vendors objectively

RFP Requirements:
${JSON.stringify(rfpData, null, 2)}

Vendor Proposals:
${JSON.stringify(proposals, null, 2)}

Respond ONLY with valid JSON: {"recommendedVendorId": "<string>", "reasoning": "<string>", "comparisonSummary": "<string>"}`;

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT_COMPARE_PROPOSALS }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1536,
        },
      });

      const response = await result.response;
      let text = response.text().trim();

      text = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const recommendation = JSON.parse(text);

      return recommendation;
    } catch (error: any) {
      console.error(
        "AI Service Error (compareProposals):",
        error.message || error
      );
      throw new Error(`Failed to compare proposals: ${error.message}`);
    }
  }

  // Generate professional RFP email content
  async generateRFPEmailContent(
    rfpData: StructuredRFP,
    vendorName: string
  ): Promise<{
    subject: string;
    body: string;
  }> {
    try {
      const SYSTEM_PROMPT_COMPARE_PROPOSALS = `You are a professional procurement officer. Generate a formal RFP email.
  
  Create:
  - subject: Professional email subject line
  - body: Professional email body that includes all RFP details in a clear, structured format
  
  RFP Details:
  ${JSON.stringify(rfpData, null, 2)}
  
  The email should:
  1. Be professional and courteous
  2. Clearly state all requirements
  3. Include deadlines if specified
  4. Request a detailed quotation
  5. Provide clear instructions for response
  
  IMPORTANT: 
  - The body text must NOT contain any unescaped quotes or newlines
  - Replace all newlines with \\n
  - Escape all quotes properly
  - Respond with valid JSON only
  
  Respond ONLY with valid JSON in this exact format:
  {"subject": "your subject here", "body": "your email body with \\n for newlines"}`;
  
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT_COMPARE_PROPOSALS}\n\nVendor Name: ${vendorName}` }]
          }
        ],
        generationConfig: {
          temperature: 0.4, // Lower temperature for more consistent formatting
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1536,
        },
      });
  
      const response = await result.response;
      let text = response.text().trim();
  
      // Clean up response - remove markdown code blocks
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
      // Try to parse JSON
      let emailContent;
      try {
        emailContent = JSON.parse(text);
      } catch (parseError) {
        // If JSON parsing fails, try to extract subject and body manually
        console.warn('JSON parsing failed, using fallback method');
        
        // Fallback: Use a simple template
        emailContent = {
          subject: `RFP: ${rfpData.title}`,
          body: this.generateFallbackEmailBody(rfpData, vendorName)
        };
      }
  
      return emailContent;
    } catch (error: any) {
      console.error('AI Service Error (generateEmail):', error.message || error);
      
      // Return fallback email instead of throwing error
      console.log('Using fallback email generation');
      return {
        subject: `RFP: ${rfpData.title}`,
        body: this.generateFallbackEmailBody(rfpData, vendorName)
      };
    }
  }
  
  private generateFallbackEmailBody(rfpData: StructuredRFP, vendorName: string): string {
    const items = rfpData.items.map(item => 
      `- ${item.name}: ${item.quantity} units${item.specifications ? ' (' + Object.entries(item.specifications).map(([k, v]) => `${k}: ${v}`).join(', ') + ')' : ''}`
    ).join('\n');
  
    return `Dear ${vendorName},
  
  We are pleased to invite you to submit a proposal for the following procurement:
  
  ${rfpData.description}
  
  REQUIREMENTS:
  ${items}
  
  ${rfpData.budget ? `Budget: $${rfpData.budget.toLocaleString()}` : ''}
  ${rfpData.deliveryDays ? `Delivery Timeline: ${rfpData.deliveryDays} days` : ''}
  ${rfpData.paymentTerms ? `Payment Terms: ${rfpData.paymentTerms}` : ''}
  ${rfpData.warrantyYears ? `Warranty Required: ${rfpData.warrantyYears} year(s)` : ''}
  
  ${rfpData.additionalRequirements && rfpData.additionalRequirements.length > 0 ? 
    `ADDITIONAL REQUIREMENTS:\n${rfpData.additionalRequirements.map(req => `- ${req}`).join('\n')}\n` : ''}
  
  Please provide a detailed quotation including:
  1. Item-by-item pricing
  2. Total cost
  3. Delivery timeline
  4. Payment terms
  5. Warranty information
  6. Any additional services or benefits
  
  We look forward to receiving your proposal.
  
  Best regards,
  Procurement Team`;
  }

}
