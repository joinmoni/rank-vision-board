export const visionBoardCompleteEmail = (boardUrl: string) => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Your Vision Board is Ready - Rank</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background: #FAF5F0;
      font-family: Arial, sans-serif;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background: #FAF5F0; padding: 40px 0"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background: #ffffff;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            "
          >
            <!-- Header -->
            <tr>
              <td style="padding: 40px 40px 20px 40px; text-align: center; background: #FFF9F3;">
                <img
                  src="https://rank-vision-board.vercel.app/rank-logo.svg"
                  alt="Rank Logo"
                  style="height: 35px; width: auto; margin-bottom: 20px;"
                />
                <h2
                  style="
                    color: #1A1A1A;
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: -1px;
                  "
                >
                  Hi there!
                </h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td
                style="
                  padding: 20px 40px 40px 40px;
                  background: #ffffff;
                  text-align: center;
                "
              >
                <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 24px 0; line-height: 1.6;">
                  Your vision board is ready! Click the link below to view and download your 2026 vision board.
                </p>

                <a
                  href="${boardUrl}"
                  style="
                    display: inline-block;
                    background: #FF7A00;
                    color: #ffffff;
                    padding: 16px 32px;
                    border-radius: 12px;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 0 0 24px 0;
                  "
                >
                  View Your Vision Board
                </a>

                <p style="font-size: 14px; color: #666; margin: 24px 0 0 0; line-height: 1.5;">
                  Thank you for using Rank to create your vision board!
                </p>

                <p style="font-size: 12px; color: #aaa; margin: 24px 0 0 0;">
                  &copy; 2025 Rank. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

