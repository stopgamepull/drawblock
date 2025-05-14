jQuery(document).ready(function($) {
    // Инициализация переменных
    let wallet = localStorage.getItem('connectedWallet') || null;
    
    // Проверка состояния кошелька при загрузке страницы
    updateWalletState();
    
    // Инициализация canvas
    const canvas = new fabric.Canvas('drawing-canvas', {
        isDrawingMode: true,
        backgroundColor: '#ffffff'
    });
    canvas.freeDrawingBrush.color = '#000000';
    canvas.freeDrawingBrush.width = 5;

    // Загружаем фоновое изображение
fabric.Image.fromURL('https://draw-block.com/wp-content/uploads/2025/04/Screenshot-2025-04-02-230553.jpg', function(img) {
    // Устанавливаем изображение как фон
    img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: false, // Чтобы нельзя было выделить/переместить фон
        evented: false    // Чтобы события мыши проходили сквозь фон
    });
    
    // Масштабируем изображение под размер canvas
    img.scaleToWidth(canvas.width);
    img.scaleToHeight(canvas.height);
    
    // Добавляем изображение на самый нижний слой
    canvas.add(img);
    canvas.sendToBack(img); // Убедимся, что фон находится сзади
    
    // Отрисовываем canvas
    canvas.renderAll();
}, {
    crossOrigin: 'anonymous' // Важно для корректного экспорта
});

    // Функция для обновления состояния кошелька
    function updateWalletState() {
        if (wallet) {
            $('body').addClass('wallet-connected');
            $('#connect-wallet-btn').addClass('connected');
            $('#connect-wallet-btn .wallet-status').text(shortenAddress(wallet));
        } else {
            $('body').removeClass('wallet-connected');
            $('#connect-wallet-btn').removeClass('connected');
            $('#connect-wallet-btn .wallet-status').text('Connect Wallet');
        }
    }

    // Функция для показа уведомлений
    function showNotification(message, type = 'info', duration = 3000) {
        const $notification = $(`
            <div class="notification ${type}">
                ${message}
            </div>
        `);
        
        $('body').append($notification);
        setTimeout(() => $notification.addClass('visible'), 100);
        
        setTimeout(() => {
            $notification.removeClass('visible');
            setTimeout(() => $notification.remove(), 300);
        }, duration);
    }

    // Tab switching
    $('.tab-button').on('click', function() {
        const tabId = $(this).data('tab');
        $('.tab-button').removeClass('active');
        $(this).addClass('active');
        $('.tab-content').removeClass('active');
        $(`#${tabId}`).addClass('active');
        
        if (tabId === 'gallery-tab') {
            loadDrawings();
        }
    });

    // Brush size selector
    $('#brush-size').on('change', function() {
        canvas.freeDrawingBrush.width = parseInt($(this).val());
    });

    // Color selection
    $('.color-btn').on('click', function() {
        $('.color-btn').removeClass('active');
        $(this).addClass('active');
        canvas.freeDrawingBrush.color = $(this).data('color');
    });

    // Clear canvas
    $('#clear-canvas').on('click', function() {
        // Получаем все объекты на canvas
        const objects = canvas.getObjects();
        
        // Удаляем все, кроме фонового изображения
        objects.forEach(obj => {
            if (obj !== backgroundImage) { // Убедитесь, что сохранили ссылку на фоновое изображение
                canvas.remove(obj);
            }
        });
        
        canvas.renderAll();
    });

    // Submit drawing
    $('#submit-drawing').on('click', function() {
        const title = $('#drawing-title').val().trim();
        const ticker = $('#drawing-ticker').val().trim();
        const author = $('#drawing-author').val().trim();
        
        if (!title) {
            showNotification('Please enter a title for your drawing', 'error');
            return;
        }
        
        if (!ticker) {
            showNotification('Please enter a ticker symbol', 'error');
            return;
        }
        
        if (!author) {
            showNotification('Please enter your name', 'error');
            return;
        }

        const canvasData = canvas.toDataURL({
            format: 'png',
            quality: 1
        });

        $.ajax({
            url: drawing_vars.ajax_url,
            type: 'POST',
            data: {
                action: 'submit_drawing',
                security: drawing_vars.nonce,
                title: title,
                ticker: ticker,
                author: author,
                image: canvasData
            },
            beforeSend: function() {
                $('#submit-drawing').prop('disabled', true).text('Posting...');
            },
            success: function(response) {
                if (response.success) {
                    showNotification('Drawing posted successfully!', 'success');
                    $('#drawing-title, #drawing-ticker, #drawing-author').val('');
                    canvas.clear();
                    canvas.backgroundColor = '#ffffff';
                    canvas.renderAll();
                    $('.tab-button[data-tab="gallery-tab"]').click();
                }
            },
            error: function() {
                showNotification('Error posting drawing', 'error');
            },
            complete: function() {
                $('#submit-drawing').prop('disabled', false).text('Post Drawing');
            }
        });
    });

    // Load drawings for gallery
    function loadDrawings() {
        $('#drawings-gallery').html('<div class="loading-spinner"></div>');
        
        $.ajax({
            url: drawing_vars.ajax_url,
            type: 'POST',
            data: {
                action: 'get_drawings',
                security: drawing_vars.nonce
            },
            success: function(response) {
                if (response.success && response.data.length > 0) {
                    renderDrawings(response.data);
                } else {
                    $('#drawings-gallery').html('<p class="no-drawings">No drawings found. Be the first to create one!</p>');
                }
            },
            error: function() {
                showNotification('Error loading drawings', 'error');
            }
        });
    }

    // Render drawings in gallery
    function renderDrawings(drawings) {
        let html = '';
        
        drawings.forEach(drawing => {
            const hasVoted = checkIfVoted(drawing.id);
            const votes = parseInt(drawing.votes) || 0;
            const isDisabled = !wallet || hasVoted;
            
            html += `
                <div class="drawing-card" data-post-id="${drawing.id}">
                    <img src="${drawing.image}" alt="${drawing.title}" class="drawing-image">
                    <div class="drawing-info">
                        <h3 class="drawing-title">${drawing.title}</h3>
                        <div class="drawing-meta">
                            <span>${drawing.ticker}</span>
                            <span>${drawing.author}</span>
                        </div>
                        <div class="drawing-meta">
                            <span>${drawing.date}</span>
                        </div>
                    </div>
                    <div class="vote-section">
                        <button class="vote-button ${hasVoted ? 'voted' : ''}" 
                                data-post-id="${drawing.id}"
                                ${isDisabled ? 'disabled' : ''}
                                title="${isDisabled ? 'Connect Wallet' : ''}">
                            <svg class="vote-icon" viewBox="0 0 24 24">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            <span class="vote-count">${votes}</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        $('#drawings-gallery').html(html);
    }

    // Voting functionality
    $(document).on('click', '.vote-button:not(.voted)', function() {
        const $button = $(this);
        const $voteCount = $button.find('.vote-count');
        const postId = $button.data('post-id');
        
        if(!wallet) {
            showNotification('Please connect wallet to vote', 'error');
            $('#wallet-modal').show();
            return;
        }

        let currentVotes = parseInt($voteCount.text()) || 0;
        $voteCount.text(currentVotes + 1);
        $button.addClass('voted').prop('disabled', true);
        
        $.ajax({
            url: drawing_vars.ajax_url,
            type: 'POST',
            data: {
                action: 'submit_vote',
                security: drawing_vars.nonce,
                post_id: postId,
                wallet: wallet
            },
            success: function(response) {
                if(response.success) {
                    showNotification('Vote submitted!', 'success');
                    localStorage.setItem(`voted_${postId}`, '1');
                }
            },
            error: function(xhr) {
                $voteCount.text(currentVotes);
                $button.removeClass('voted').prop('disabled', false);
                const errorMsg = xhr.responseJSON?.message || 'Voting failed';
                showNotification(errorMsg, 'error');
            }
        });
    });

    // Check if user has voted for this post
    function checkIfVoted(postId) {
        return localStorage.getItem(`voted_${postId}`) === '1';
    }

    // Wallet connection
    $('#connect-wallet-btn').on('click', function() {
        if(wallet) {
            disconnectWallet();
        } else {
            $('#wallet-modal').show();
        }
    });

    $('.wallet-option').on('click', function() {
        const walletType = $(this).data('wallet');
        connectWallet(walletType);
    });

    $('.close-modal').on('click', function() {
        $('#wallet-modal').hide();
    });

    // Connect wallet function
    function connectWallet(walletType) {
        if(typeof window.solana === 'undefined') {
            showNotification('Please install a Solana wallet extension', 'error', 5000);
            return;
        }

        showNotification('Connecting wallet...', 'info');
        
        window.solana.connect()
            .then(() => {
                wallet = window.solana.publicKey.toString();
                localStorage.setItem('connectedWallet', wallet);
                updateWalletState();
                $('#wallet-modal').hide();
                showNotification('Wallet connected successfully!', 'success');
                $('.vote-button:not(.voted)').prop('disabled', false);
            })
            .catch(err => {
                showNotification('Connection failed: ' + err.message, 'error');
            });
    }

    // Disconnect wallet
    function disconnectWallet() {
        wallet = null;
        localStorage.removeItem('connectedWallet');
        updateWalletState();
        $('.vote-button').prop('disabled', true);
        showNotification('Wallet disconnected', 'info');
    }

    // Shorten wallet address
    function shortenAddress(address) {
        if(!address) return '';
        return address.substring(0, 4) + '...' + address.substring(address.length - 4);
    }

    // Initial load if on gallery tab
    if ($('#gallery-tab').hasClass('active')) {
        loadDrawings();
    }

    // Auto-refresh gallery every 30 seconds
    setInterval(() => {
        if ($('#gallery-tab').hasClass('active')) {
            loadDrawings();
        }
    }, 30000);

    // Twitter sharing
$('#share-twitter').on('click', function() {
    // Get the canvas image as data URL
    const canvasData = canvas.toDataURL({
        format: 'png',
        quality: 1
    });
    
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.download = 'my-drawing.png';
    link.href = canvasData;
    
    // First download the image
    link.click();
    
    // Then open Twitter share dialog
    const title = $('#drawing-title').val().trim() || 'My Drawing';
    const ticker = $('#drawing-ticker').val().trim() || '';
    const text = `Check out my drawing${ticker ? ` of ${ticker}` : ''} on @YourAppName! ${title}`;
    
    // Note: Twitter doesn't support direct image upload via URL, so user will need to attach manually
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
    
    showNotification('Downloaded your drawing. Please attach it to your tweet!', 'info', 5000);
});
});