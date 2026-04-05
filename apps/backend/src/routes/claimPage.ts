import { Router } from 'express';
import type { Request, Response } from 'express';
import { getGiftByClaimCode } from '../services/db.js';

export const claimPageRouter = Router();

const APK_URL = process.env.APK_URL || 'https://github.com/R-O-S-T/inst/releases/latest/download/app-release.apk';

claimPageRouter.get('/claim/:claimCode', (req: Request, res: Response) => {
  const { claimCode } = req.params;
  const entropy = String(req.query.e || '');
  const gift = getGiftByClaimCode(claimCode);

  const amount = gift?.amount ?? '?';
  const token = gift?.token ?? 'tokens';
  const status = gift?.status ?? 'unknown';
  const deepLink = `instant://claim/${claimCode}?e=${entropy}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Instant — You received ${amount} ${token}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0D0D0D;color:#FFF;font-family:system-ui,-apple-system,sans-serif;
         display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:24px}
    .card{text-align:center;max-width:380px;width:100%}
    .emoji{font-size:64px;margin-bottom:16px}
    h1{font-size:22px;font-weight:600;margin-bottom:8px}
    .amount{color:#6366F1;font-size:36px;font-weight:700;margin-bottom:32px}
    .btn{display:block;width:100%;padding:16px;border-radius:12px;
         font-size:17px;font-weight:600;text-decoration:none;
         text-align:center;margin-bottom:12px;border:none;cursor:pointer}
    .btn-primary{background:#6366F1;color:#FFF}
    .btn-secondary{background:#1A1A1A;color:#FFF;border:1px solid #2A2A2A}
    .note{color:#666;font-size:13px;margin-top:20px;line-height:1.5}
    .status-msg{color:#999;font-size:16px}
    .copied{color:#22C55E;font-size:14px;margin-top:8px;display:none}
  </style>
</head><body>
  <div class="card">
    ${status === 'pending' ? `
      <div class="emoji">&#127873;</div>
      <h1>Someone sent you</h1>
      <div class="amount">${amount} ${token}</div>

      <button class="btn btn-primary" id="claimBtn" onclick="handleClaim()">
        Download &amp; Claim
      </button>
      <a class="btn btn-secondary" href="${deepLink}" id="openBtn" style="display:none">
        Open in App
      </a>
      <p class="copied" id="copiedMsg">Link copied to clipboard</p>
      <p class="note">
        The app will automatically detect this gift after you install and open it.
      </p>

      <script>
        var deepLink = ${JSON.stringify(deepLink)};

        function handleClaim() {
          // 1. Copy deep link to clipboard
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(deepLink).catch(function() {
              fallbackCopy(deepLink);
            });
          } else {
            fallbackCopy(deepLink);
          }

          document.getElementById('copiedMsg').style.display = 'block';

          // 2. Try opening the app directly first
          var opened = false;
          window.location.href = deepLink;

          // 3. After a delay, if still on this page, offer APK download
          setTimeout(function() {
            if (!document.hidden) {
              window.location.href = '${APK_URL}';
              document.getElementById('openBtn').style.display = 'block';
              document.getElementById('claimBtn').textContent = 'Download Again';
            }
          }, 1500);
        }

        function fallbackCopy(text) {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
      </script>
    ` : `
      <div class="emoji">&#9203;</div>
      <h1>Gift ${status}</h1>
      <p class="status-msg">This gift has already been ${status}.</p>
    `}
  </div>
</body></html>`);
});
