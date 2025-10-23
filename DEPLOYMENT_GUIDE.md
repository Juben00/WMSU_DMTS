# Deployment Guide - Asset Access Issues

## Problem
The deployed application shows 403 Forbidden errors when loading JavaScript and CSS assets from the `/build/assets/` directory.

## Solution Applied

### 1. Updated `.htaccess` Configuration
- Added rules to explicitly allow access to `/build/` directory
- Set proper MIME types for JavaScript, CSS, and other assets
- Added compression and caching headers for better performance

### 2. Created Build Directory `.htaccess`
- Added specific configuration for the `public/build/` directory
- Disabled URL rewriting for static assets
- Set proper access permissions and headers

## Additional Server Configuration (If Issues Persist)

### For Apache Servers
If you're still experiencing issues, ensure these modules are enabled:
```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod deflate
sudo a2enmod mime
sudo service apache2 restart
```

### For Nginx Servers
If using Nginx, add this to your server configuration:
```nginx
location /build/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri $uri/ =404;
}

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### File Permissions
Ensure proper file permissions on your server:
```bash
# Make sure the web server can read the files
chmod -R 755 public/build/
chown -R www-data:www-data public/build/  # Adjust user/group as needed
```

## Verification
After applying these changes:
1. Clear your browser cache
2. Test the application in an incognito/private window
3. Check browser developer tools for any remaining 403 errors

## Laravel Vite Configuration
The current Vite configuration looks correct:
- Input files: `resources/css/app.css`, `resources/js/app.tsx`
- Build output: `public/build/` (default)
- Manifest file: `public/build/manifest.json`

## Troubleshooting
If issues persist:
1. Check server error logs for more details
2. Verify that the hosting provider allows `.htaccess` files
3. Ensure the document root is set to the `public/` directory
4. Contact your hosting provider about static file serving restrictions
