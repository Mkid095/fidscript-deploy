/**
 * The mail the login code arrives in.
 *
 * The template is here rather than inside the service so that the service
 * says what it does — issue a code, rate-limit the request, never reveal
 * whether the address exists — and the message says what it looks like.
 */
export const CODE_TTL_MINUTES = 10;

/** The plain-text version of the code mail. */
export function magicCodeText(code: string): string {
  return `Your login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you did not request this, ignore this email.`;
}

/** The HTML version of the code mail. */
export function magicCodeHtml(code: string): string {
  return `<!DOCTYPE html>

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FIDScript Login Code</title>
</head>
<body style="margin:0;padding:0;background:#080a0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f1117;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0f1117;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e2130;">
              <img
                src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
                alt="FIDScript"
                width="56"
                height="56"
                style="display:block;margin:0 auto 8px;border-radius:8px;"
              />
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#f97316;text-transform:uppercase;">fidscript deploy</p>
              <p style="margin:4px 0 0;font-size:10px;color:#64748b;letter-spacing:0.1em;">by NextMavens</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#0f1117;padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e2e8f0;">Your security code</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Use the code below to sign in to your dashboard.</p>
              <div style="background:#1e2130;border:1px solid #2a2d3a;border-radius:10px;padding:20px 32px;display:inline-block;">
                <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#f97316;font-family:'SF Mono','Fira Code',monospace;">${code}</p>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;">
                This code expires in <strong style="color:#94a3b8;">${CODE_TTL_MINUTES} minutes</strong>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#080a0d;padding:20px 40px;border-top:1px solid #1e2130;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.<br/>
                Security code requests are only valid for a single sign-in.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
`;
}
