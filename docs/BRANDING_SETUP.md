# IRL Concierge - Instagram-Style MCP Branding

## 🎨 Brand Assets Created

### 1. Logo (`assets/irl-logo.svg`)
- Instagram-inspired gradient background
- Clean, modern typography
- 256x256px SVG format (scalable)
- Rounded corners matching Instagram's aesthetic

### 2. Connector UI (`assets/connector-ui.html`)
- Full Instagram-style interface
- Animated gradient background
- Interactive elements with hover effects
- Mobile-responsive design

### 3. Configuration (`mcp-connector-config.json`)
- Complete branding specifications
- Instagram color palette
- Custom fonts and styling

## 🎨 Color Palette

```css
/* Instagram Gradient Colors */
--instagram-yellow: #FED576;
--instagram-orange: #F47133;
--instagram-pink: #BC3081;
--instagram-purple: #4C63D2;

/* IRL Brand Colors */
--primary: #BC3081;    /* Instagram Pink */
--secondary: #764BA2;  /* Deep Purple */
--accent: #667EEA;     /* Bright Purple */
```

## 📱 How to Use the Instagram-Style Branding

### In Claude Desktop

1. **Update Claude Desktop Config**:
```json
{
  "mcpServers": {
    "irl-concierge": {
      "command": "node",
      "args": ["/path/to/mcp-sf-cleaning/index.js"],
      "icon": "/path/to/mcp-sf-cleaning/assets/irl-logo.svg",
      "displayName": "IRL Concierge",
      "description": "SF Cleaning Service"
    }
  }
}
```

2. **View the UI**:
   - Open `assets/connector-ui.html` in a browser
   - See the Instagram-style interface in action

### In Vercel Deployment

1. **Add Logo to Public Directory**:
```bash
mkdir public
cp assets/irl-logo.svg public/
cp assets/connector-ui.html public/index.html
```

2. **Update `vercel.json`**:
```json
{
  "rewrites": [
    { "source": "/", "destination": "/public/index.html" },
    { "source": "/api/mcp", "destination": "/api/mcp.js" },
    { "source": "/logo", "destination": "/public/irl-logo.svg" }
  ]
}
```

## 🎨 Typography

### Fonts Used:
- **Logo/Headers**: Pacifico (Instagram-style script)
- **Body Text**: Montserrat (clean, modern sans-serif)
- **Fallback**: System fonts (-apple-system, BlinkMacSystemFont)

### To Add to Your Website:
```html
<link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
```

## ✨ CSS Animations

### Gradient Animation:
```css
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Pulse Effect (for status indicators):
```css
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

## 🚀 Quick Start

1. **Test the UI Locally**:
```bash
# Open the Instagram-style interface
open assets/connector-ui.html
```

2. **Deploy with Branding**:
```bash
# Copy assets to deployment
cp -r assets/* .
vercel --prod
```

3. **Use in Claude Desktop**:
   - The logo will appear next to "IRL Concierge" in the connectors list
   - Instagram-style gradient colors in the UI

## 📸 Instagram Integration Ideas

1. **Share Booking Confirmations**:
   - Generate Instagram-ready booking confirmation images
   - Include IRL branding with gradient backgrounds

2. **Stories Integration**:
   - Create story-sized (1080x1920) confirmation cards
   - Add animated elements for sharing

3. **Social Proof**:
   - Add Instagram handle: @irlconcierge
   - Include hashtags: #IRLConcierge #SFCleaning

## 🎯 Brand Guidelines

### Do's:
- ✅ Use the gradient colors consistently
- ✅ Maintain rounded corners (20px radius)
- ✅ Keep the playful, modern aesthetic
- ✅ Use white space effectively

### Don'ts:
- ❌ Don't use harsh shadows
- ❌ Don't mix with conflicting color schemes
- ❌ Don't use serif fonts (except for special headers)
- ❌ Don't make the interface too complex

## 📱 Mobile Responsive

The UI automatically adapts to mobile screens:
- Gradient background remains full-screen
- Cards stack vertically
- Touch-friendly button sizes
- Optimized font sizes for readability

## 🔗 Integration with MCP

The branding carries through to:
1. Claude Desktop connector list
2. Web interface at your Vercel URL
3. Email confirmations (update email templates)
4. API responses (branded messages)

## Example Usage in Code:

```javascript
// In your API responses
const brandedResponse = {
  content: [{
    type: 'text',
    text: '✨ IRL Concierge - Booking Confirmed! 📍',
    style: {
      gradient: 'instagram',
      emoji: true
    }
  }]
};
```

Your IRL Concierge MCP connector now has full Instagram-style branding! 🎨✨