const fs = require('fs');
const path = require('path');

const files = [
    'resources/js/pages/Admin/Products/Index.tsx',
    'resources/js/pages/Admin/Products/Create.tsx',
    'resources/js/pages/Admin/Products/Edit.tsx',
    'resources/js/pages/Admin/Dashboard.tsx',
    'resources/js/pages/Admin/ProductVariants/Index.tsx',
    'resources/js/pages/Admin/ProductVariants/Create.tsx',
    'resources/js/pages/Admin/ProductVariants/Edit.tsx',
    'resources/js/pages/Admin/Users/Index.tsx',
    'resources/js/pages/Admin/Orders/Index.tsx',
    'resources/js/pages/Admin/Orders/Show.tsx',
    'resources/js/pages/User/Orders/Index.tsx',
    'resources/js/pages/User/Orders/Show.tsx'
];

for (const file of files) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');

    // Extract component name from export default function ComponentName
    const matchComponent = content.match(/export default function (\w+)/);
    if (!matchComponent) {
        console.log(`Could not find component name in ${file}`);
        continue;
    }
    const componentName = matchComponent[1];

    // Remove import AppLayout
    content = content.replace(/import AppLayout from '@\/layouts\/app-layout';\n?/, '');

    // Extract breadcrumbs if they are hardcoded in the <AppLayout breadcrumbs={[...]}>
    let breadcrumbsSource = '';
    const matchBreadcrumbsInline = content.match(/<AppLayout\s+breadcrumbs=\{([^>]+)\}\s*>/m);
    if (matchBreadcrumbsInline) {
        breadcrumbsSource = matchBreadcrumbsInline[1];
    } else {
        // sometimes breadcrumbs are defined as a const above
        const matchBreadcrumbsConst = content.match(/const breadcrumbs(?:: Breadcrumbs)? = (\[[\s\S]*?\]);/);
        if (matchBreadcrumbsConst) {
            breadcrumbsSource = 'breadcrumbs'; // we'll just reference the const
        }
    }

    if (!breadcrumbsSource) {
        // Look for multiline <AppLayout breadcrumbs={...}>
        const matchMultiline = content.match(/<AppLayout\s+breadcrumbs=\{([\s\S]*?)\}\s*>/);
        if (matchMultiline) {
            breadcrumbsSource = matchMultiline[1];
        }
    }

    // Remove the opening <AppLayout ...>
    content = content.replace(/<AppLayout\b[^>]*>/, '<>');
    
    // Replace the closing </AppLayout> with </>
    const lastClosingTagIndex = content.lastIndexOf('</AppLayout>');
    if (lastClosingTagIndex !== -1) {
        content = content.substring(0, lastClosingTagIndex) + '</>' + content.substring(lastClosingTagIndex + 12);
    }

    // Append .layout = { breadcrumbs }
    if (breadcrumbsSource) {
        const layoutCode = `\n${componentName}.layout = {\n    breadcrumbs: ${breadcrumbsSource},\n};\n`;
        content += layoutCode;
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Processed ${file}`);
}
