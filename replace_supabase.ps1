$files = Get-ChildItem -Filter *.html
foreach ($file in $files) {
    if ($file.Name -eq "components.html") { continue }
    
    $content = [IO.File]::ReadAllText($file.FullName)
    
    # Check if we already injected Supabase. If not, replace <script src="components.js"></script>
    if ($content -notmatch 'cdn.jsdelivr.net/npm/@supabase/supabase-js') {
        $replacement = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>' + "`r`n    <script src=`"db.js`"></script>" + "`r`n    <script src=`"components.js`"></script>"
        $content = $content -replace '<script src="components\.js"></script>', $replacement
        [IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}
