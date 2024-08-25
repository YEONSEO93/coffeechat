document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const fileDragArea = document.getElementById('fileDragArea');
    const filePreview = document.getElementById('filePreview');

    // Handle drag and drop events
    fileDragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDragArea.classList.add('dragover');
    });

    fileDragArea.addEventListener('dragleave', () => {
        fileDragArea.classList.remove('dragover');
    });

    fileDragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDragArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileDragArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        handleFiles(files);
    });

    // Function to handle files and display preview
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    filePreview.src = e.target.result;
                    filePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    }
});
