import axios, { AxiosInstance } from 'axios';
import { Router, Request, Response } from 'express';
import { authenticate } from '../common/middleware/auth.middleware';
import { getReport } from '../reports/reports.service';
import { query } from '../db';

// ─── JasperReports REST v2 Client ────────────────
class JasperClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.JASPER_BASE_URL,
      auth: {
        username: process.env.JASPER_USERNAME!,
        password: process.env.JASPER_PASSWORD!,
      },
      timeout: 60000,
    });
  }

  async executeReport(
    jasperUrl: string,
    params: Record<string, string | number | boolean>,
    format: string = 'pdf'
  ): Promise<Buffer> {
    try {
      // Build query parameters from params object
      const queryParams = new URLSearchParams();
      queryParams.append('ignorePagination', 'true');
      
      // Add all parameters from the params object
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });

      // Construct the direct report API URL
      // jasperUrl should be like "/reports/JapserTest/liste_garantie"
      const reportPath = jasperUrl.startsWith('/') ? jasperUrl : `/${jasperUrl}`;
      const url = `/rest_v2/reports${reportPath}.${format}?${queryParams.toString()}`;
      
      console.log('[Jasper] Executing report:', { url, params });

      const outputResponse = await this.client.get(url, { 
        responseType: 'arraybuffer' 
      });
      
      console.log('[Jasper] Report execution successful');
      return Buffer.from(outputResponse.data);
    } catch (err: any) {
      console.error('[Jasper] Execution error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        data: err.response?.data,
      });
      
      if (err.response?.status === 404) {
        throw new Error(`Report not found in JasperServer: ${jasperUrl}. Check the report path exists at: /rest_v2/reports${jasperUrl}.${format}`);
      }
      throw err;
    }
  }
}

const jasperClient = new JasperClient();

// ─── Jasper Router ───────────────────────────────
const router = Router();

const MIME_TYPES: Record<string, string> = {
  pdf:   'application/pdf',
  xlsx:  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:   'application/vnd.ms-excel',
  csv:   'text/csv',
  html:  'text/html',
  docx:  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

router.post('/execute/:reportId', authenticate, async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const { parameters = {}, format = 'pdf' } = req.body;

  try {
    // Load report config
    const report = await getReport(reportId) as any;
    if (!report || !report.is_active) {
      res.status(404).json({ error: 'Report not found or inactive' });
      return;
    }

    // Check access for non-admin users
    if (req.user!.role !== 'admin' && !report.is_public) {
      const { rows } = await query(
        'SELECT id FROM user_report_access WHERE user_id = $1 AND report_id = $2',
        [req.user!.userId, reportId]
      );
      if (!rows.length) {
        res.status(403).json({ error: 'Access denied to this report' });
        return;
      }
    }

    // Validate required parameters
    const requiredParams = (report.parameters ?? []).filter(
      (p: any) => p.required
    );
    for (const param of requiredParams) {
      if (parameters[param.name as string] === undefined || parameters[param.name as string] === '') {
        res.status(400).json({ error: `Required parameter missing: ${param.label}` });
        return;
      }
    }

    const outputBuffer = await jasperClient.executeReport(
      report.jasper_url,
      parameters,
      format
    );

    const mimeType = MIME_TYPES[format] ?? 'application/octet-stream';
    const filename = `${report.name.replace(/\s+/g, '_')}.${format}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', outputBuffer.length);
    res.send(outputBuffer);
  } catch (err: unknown) {
    console.error('[Jasper] Execution error:', err);
    
    // Try to extract JasperReports error message
    const axiosErr = err as any;
    if (axiosErr?.response?.data?.message) {
      res.status(400).json({ 
        error: 'Report execution failed',
        details: axiosErr.response.data.message 
      });
    } else if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Report execution failed' });
    }
  }
});

export default router;
