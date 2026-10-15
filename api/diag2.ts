import { SHAPES } from "./catalog";

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default function handler(_req: unknown, res: VercelResponse) {
  res.status(200).json({ ok: true, shapesCount: SHAPES.length });
}
