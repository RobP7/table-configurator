interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, method: req.method });
}
