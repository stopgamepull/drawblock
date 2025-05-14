document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('checkContractBtn').addEventListener('click', checkContract);
});

function checkContract() {
    const contractAddress = document.getElementById('contractAddress').value;
    const infoDiv = document.getElementById('coinInfo');
    infoDiv.innerHTML = 'Загрузка...';

    // Используем стандартный WordPress AJAX
    jQuery.ajax({
        url: ajax_object.ajax_url, // Передаем URL через локализацию
        type: 'POST',
        data: {
            action: 'get_coin_info',
            contract_address: contractAddress
        },
        success: function(response) {
            infoDiv.innerHTML = response;
        },
        error: function() {
            infoDiv.innerHTML = 'Ошибка при получении данных';
        }
    });
}