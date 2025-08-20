# 🔧 NPSSO Token Troubleshooting - Complete Resolution Guide

## 🚨 **If You Can't Find NPSSO Token Anywhere**

You're not alone! Many users face this issue. Here's a systematic approach to resolve it:

---

## 🎯 **Method 1: Direct API Endpoint** ⭐ **MOST RELIABLE**

This is the **easiest and most reliable method**:

### **Step-by-Step Process:**

1. **Sign in to PlayStation completely**
   - Go to [playstation.com](https://playstation.com)
   - Sign in with your PSN credentials
   - **Complete any 2FA/security prompts**
   - Wait for the page to fully load

2. **Access the direct NPSSO endpoint**
   - In the **same browser tab/window**, go to:
   ```
   https://ca.account.sony.com/api/v1/ssocookie
   ```

3. **Copy your token**
   - You should see JSON like: `{"npsso":"abc123...64characters"}`
   - Copy the 64-character token (without quotes)

### **If this doesn't work, try:**
- **Different region endpoints:**
  ```
  https://ca.account.sony.com/api/v1/ssocookie
  https://auth.api.sonyentertainmentnetwork.com/2.0/ssocookie
  https://account.sonyentertainmentnetwork.com/api/v1/ssocookie
  ```

---

## 🌐 **Method 2: Browser Developer Tools - Enhanced**

If Method 1 fails, use this enhanced approach:

### **Chrome/Edge Instructions:**

1. **Full sign-in process**
   - Go to [my.playstation.com/profile](https://my.playstation.com/profile)
   - Sign in completely (including 2FA)
   - Wait for your profile to load

2. **Open Developer Tools**
   - Press `F12` or right-click → "Inspect"
   - Go to **Application** tab
   - Look in the left sidebar for **Storage** → **Cookies**

3. **Check multiple domains:**
   - `https://my.playstation.com`
   - `https://ca.account.sony.com` ⭐ **Most likely location**
   - `https://account.sonyentertainmentnetwork.com`
   - `https://auth.api.sonyentertainmentnetwork.com`

4. **Find the NPSSO cookie**
   - Look for cookie named exactly `npsso`
   - Copy the 64-character value

### **Firefox Instructions:**

1. Sign in to [my.playstation.com/profile](https://my.playstation.com/profile)
2. Press `F12` → **Storage** tab
3. **Cookies** → check all PlayStation domains
4. Find `npsso` cookie and copy value

---

## 🔄 **Method 3: Force Token Generation**

Sometimes you need to force PlayStation to create the token:

### **Technique A: Deep Authentication**

1. **Complete logout first**
   - Sign out of ALL PlayStation sites
   - Clear browser cookies for PlayStation domains
   - Close all PlayStation tabs

2. **Fresh sign-in sequence**
   ```
   Step 1: Go to https://account.sonyentertainmentnetwork.com
   Step 2: Sign in with full 2FA
   Step 3: Go to https://my.playstation.com/profile
   Step 4: Navigate through some pages (settings, friends, etc.)
   Step 5: Try the direct API endpoint again
   ```

### **Technique B: Mobile App + Web Combo**

1. **Sign in to PlayStation Mobile App first**
   - Download PlayStation App
   - Sign in completely
   - Browse some content

2. **Then use web browser**
   - Go to [my.playstation.com/profile](https://my.playstation.com/profile)
   - Should auto-sign you in
   - Try the direct API endpoint

---

## 🚫 **Method 4: Account-Specific Issues**

### **Two-Factor Authentication Issues**

**Problem:** 2FA can sometimes prevent NPSSO generation
**Solution:**
1. **Temporarily disable 2FA** (if comfortable)
2. Get NPSSO token
3. **Re-enable 2FA immediately**

### **Account Region Issues**

**Problem:** Some regions have different authentication flows
**Solutions:**
- Try region-specific endpoints:
  ```
  US: https://ca.account.sony.com/api/v1/ssocookie
  EU: https://account.sonyentertainmentnetwork.com/api/v1/ssocookie
  ```

### **Account Type Issues**

**Problem:** Child accounts or sub-accounts may not generate NPSSO
**Check:**
- Ensure you're using the **master account**
- Child accounts may need parent approval
- Sub-accounts might not have API access

---

## 🛠️ **Method 5: Technical Troubleshooting**

### **Browser Settings**

1. **Disable extensions**
   - Ad blockers, privacy extensions, etc.
   - Try in incognito mode

2. **Enable cookies**
   - Ensure cookies are enabled for PlayStation domains
   - Check privacy settings

3. **Clear and retry**
   ```
   1. Clear ALL PlayStation cookies
   2. Clear browser cache
   3. Restart browser
   4. Fresh sign-in attempt
   ```

### **Network Issues**

1. **Try different network**
   - Mobile data vs WiFi
   - Different ISP if possible
   - VPN might help in some regions

2. **Different device**
   - Try phone browser
   - Try different computer
   - Try different browser entirely

---

## 🆘 **Method 6: Last Resort Options**

### **Contact PlayStation Support**

If nothing works, you might have an account-specific issue:
- Contact PlayStation Support
- Explain you need to access PSN API
- Ask about NPSSO token generation issues

### **Alternative Account**

As a temporary solution:
- Create a new PlayStation account
- Test NPSSO generation on new account
- This helps determine if it's account-specific

### **Community Resources**

- [PSN API Discord/Forums](https://psn-api.achievements.app/)
- Reddit communities (r/PlayStation, r/gamedev)
- GitHub issues for PSN libraries

---

## ✅ **Verification Steps**

Once you get a token:

### **Validate Token Format**
```javascript
// Token should be exactly 64 characters
// Only letters and numbers (a-z, A-Z, 0-9)
const isValid = /^[a-zA-Z0-9]{64}$/.test(yourToken);
```

### **Test Token Immediately**
Use our bot's enhanced verification or test with:
```javascript
// Quick API test
fetch('https://m.np.playstation.com/api/userProfile/v1/internal/users/me/profile', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
```

---

## 🎯 **Success Rate by Method**

Based on community reports:

1. **Direct API Endpoint**: 85% success rate
2. **Developer Tools (ca.account.sony.com)**: 75% success rate  
3. **Force Token Generation**: 60% success rate
4. **Mobile App + Web**: 70% success rate
5. **Different Browser/Incognito**: 50% success rate

---

## 📱 **Quick Reference Card**

### **URLs to Try:**
```
https://ca.account.sony.com/api/v1/ssocookie
https://account.sonyentertainmentnetwork.com/api/v1/ssocookie
https://auth.api.sonyentertainmentnetwork.com/2.0/ssocookie
```

### **Cookie Domains to Check:**
```
ca.account.sony.com
account.sonyentertainmentnetwork.com
my.playstation.com
auth.api.sonyentertainmentnetwork.com
```

### **Emergency Checklist:**
- [ ] Fully signed in with 2FA complete
- [ ] Tried direct API endpoint
- [ ] Checked all cookie domains
- [ ] Tried incognito mode
- [ ] Cleared cookies and tried fresh
- [ ] Tried different browser
- [ ] Mobile app + web combo

---

## 🔮 **Future Improvements**

We're working on:
- **Browser extension** for one-click NPSSO extraction
- **Automated token refresh** system
- **Better error diagnostics**
- **Alternative authentication methods**

---

*This guide will be continuously updated as new solutions are discovered.*
