$files = Get-ChildItem -Filter *.html
foreach ($file in $files) {
    if ($file.Name -eq "components.html") { continue }
    
    $content = [IO.File]::ReadAllText($file.FullName)
    
    # Check if tienda.js is already injected
    if ($content -notmatch 'tienda\.js') {
        # Inject right after db.js
        $content = $content -replace '<script src="db\.js"></script>', ('<script src="db.js"></script>' + "`r`n    <script src=`"tienda.js`"></script>")
        [IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}
