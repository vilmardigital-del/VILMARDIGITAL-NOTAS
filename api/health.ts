interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

export default function handler(_req: ApiRequest, res: ApiResponse) {
  res.status(200).json({ status: 'ok', platform: 'vercel' });
}
