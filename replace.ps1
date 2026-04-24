$files = Get-ChildItem -Filter *.html
foreach ($file in $files) {
    if ($file.Name -eq "components.html") { continue } # safety check
    
    $content = [IO.File]::ReadAllText($file.FullName)
    
    # Replace header and footer
    $content = $content -replace '(?s)<header.*?</header>', '<monarca-navbar></monarca-navbar>'
    $content = $content -replace '(?s)<footer.*?</footer>', '<monarca-footer></monarca-footer>'
    
    # Inject components.js script before script.js
    if ($content -notmatch '<script src="components\.js"></script>') {
        $replacement = '<script src="components.js"></script>' + "`r`n    <script src=`"script.js`"></script>"
        $content = $content -replace '<script src="script\.js"></script>', $replacement
    }
    
    # If there is no footer, inject it above components.js script
    if ($content -notmatch '<monarca-footer></monarca-footer>') {
        $replacement2 = '<monarca-footer></monarca-footer>' + "`r`n    <script src=`"components.js`"></script>"
        $content = $content -replace '<script src="components\.js"></script>', $replacement2
    }
    
    [IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
}
