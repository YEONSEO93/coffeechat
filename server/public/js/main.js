document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const fileDragArea = document.getElementById('fileDragArea');
    const filePreview = document.getElementById('filePreview');
    const createGifBtn = document.getElementById('createGifBtn');
    const gifText = document.getElementById('gifText');
    const gifCanvas = document.getElementById('gifCanvas');
    const gifPreview = document.getElementById('gifPreview');
    const progressContainer = document.getElementById('progressContainer');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressBar = document.getElementById('progressBar');

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
            if (file.type.startsWith('image/') || file.type === 'image/gif') {
                const reader = new FileReader();
                reader.onload = function (e) {
                    filePreview.src = e.target.result;
                    filePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    }

    // Function to create GIF
    createGifBtn.addEventListener('click', function () {
        if (!fileInput.files.length) {
            alert('Please upload an image first.');
            return;
        }

        const img = new Image();
        img.onload = function () {
            gifCanvas.width = img.width;
            gifCanvas.height = img.height;

            const gif = new GIF({
                workers: 2,
                quality: 15, // Adjust quality
                workerScript: '/js/gif.worker.js',
                width: img.width,
                height: img.height
            });

            progressContainer.style.display = 'block';

            const ctx = gifCanvas.getContext('2d');

            // Set the font size dynamically and ensure it fits within the canvas
            let fontSize = Math.min(gifCanvas.width / 8, 80) * 3; // Triple the original font size
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textX = gifCanvas.width / 2;
            const textY = gifCanvas.height / 2;

            // Check if text width exceeds canvas width and reduce font size if necessary
            let textWidth = ctx.measureText(gifText.value).width;
            while (textWidth > gifCanvas.width - 20) { // 20 is padding
                fontSize -= 5;
                ctx.font = `bold ${fontSize}px Arial`;
                textWidth = ctx.measureText(gifText.value).width;
            }

            for (let i = 0; i <= gifText.value.length; i += 5) {
                ctx.clearRect(0, 0, gifCanvas.width, gifCanvas.height); // Clear the canvas before drawing
                ctx.drawImage(img, 0, 0);

                // Add text shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                ctx.shadowBlur = 10;

                // Draw the text with a typing effect
                ctx.fillText(gifText.value.substring(0, i), textX, textY);

                gif.addFrame(gifCanvas, { copy: true, delay: 150 }); // Adjust delay for typing speed
            }

            gif.on('progress', function (percentage) {
                const progress = Math.round(percentage * 100);
                progressPercentage.textContent = `${progress}%`;
                progressBar.value = progress;
            });

            gif.on('finished', function (blob) {
                const url = URL.createObjectURL(blob);
                gifPreview.src = url;
                gifPreview.style.display = 'block';
                gifPreview.onload = function () {
                    URL.revokeObjectURL(url);
                };

                console.log('GIF created successfully.');

                const formData = new FormData();
                formData.append('img1', blob, 'created.gif');
                formData.append('title', document.getElementById('title').value);
                formData.append('content', document.getElementById('content').value);

                document.getElementById('postForm').onsubmit = function (e) {
                    e.preventDefault();
                    submitPost(formData);
                };

                progressContainer.style.display = 'none';
            });

            gif.render();
        };

        img.src = URL.createObjectURL(fileInput.files[0]);
    });

    function submitPost(formData) {
        fetch('/posts/edit/<%= result._id %>', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.ok) {
                    console.log('Post updated successfully.');
                    window.location.href = '/posts/list'; // Redirect to the list page after update
                } else {
                    console.error('Error updating post:', response.statusText);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
});
