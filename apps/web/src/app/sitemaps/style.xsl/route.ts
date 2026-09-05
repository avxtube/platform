const stylesheet = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="th">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>AVXTube Sitemap</title>
        <style>
          body { margin: 0; background: #f6f7f9; color: #18181b; font: 14px/1.5 system-ui, sans-serif; }
          main { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
          h1 { margin: 0; font-size: 28px; }
          p { margin: 8px 0 24px; color: #71717a; }
          table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; }
          th, td { padding: 12px 16px; border-bottom: 1px solid #e4e4e7; text-align: left; vertical-align: top; }
          th { background: #fafafa; color: #52525b; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
          tr:last-child td { border-bottom: 0; }
          a { color: #2563eb; overflow-wrap: anywhere; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .date { width: 220px; color: #71717a; white-space: nowrap; }
        </style>
      </head>
      <body>
        <main>
          <h1>AVXTube Sitemap</h1>
          <xsl:choose>
            <xsl:when test="sitemap:sitemapindex">
              <p><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemap files</p>
              <table>
                <thead><tr><th>URL</th><th class="date">Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                      <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                      <td class="date"><xsl:value-of select="sitemap:lastmod"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <p><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs</p>
              <table>
                <thead><tr><th>URL</th><th class="date">Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                      <td class="date"><xsl:value-of select="sitemap:lastmod"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`

export const revalidate = 86400

export function GET() {
  return new Response(stylesheet, {
    headers: {
      "content-type": "application/xslt+xml; charset=utf-8",
      "cache-control":
        "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      "cdn-cache-control": "public, max-age=300",
    },
  })
}
