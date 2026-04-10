function addItem() {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.className = 'item-row-input';
    div.innerHTML = `
        <div class="input-group">
            <label>विवरण</label>
            <input type="text" class="item-desc" placeholder="गेहूं (Wheat)" oninput="updatePreview()">
        </div>
        <div class="input-group">
            <label>मात्रा</label>
            <input type="number" step="0.01" class="item-qty" placeholder="0" oninput="updatePreview()">
        </div>
        <div class="input-group">
            <label>दर</label>
            <input type="number" class="item-rate" placeholder="0" oninput="updatePreview()">
        </div>
        <div class="input-group">
            <label>प्रति</label>
            <select class="item-per" oninput="updatePreview()">
                <option value="क्वि">क्विंटल (Quintal)</option>
                <option value="kg">किग्रा (KG)</option>
                <option value="Bag">बैग (Bag)</option>
            </select>
        </div>
        <button class="btn btn-delete" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(div);
    updatePreview();
}

function removeItem(btn) {
    btn.parentElement.remove();
    updatePreview();
}

function updatePreview() {
    // Basic Meta info
    document.getElementById('pr_invoice_no').innerText = document.getElementById('in_invoice_no').value || '---';
    document.getElementById('pr_date').innerText = formatDate(document.getElementById('in_date').value);
    document.getElementById('pr_order_no').innerText = document.getElementById('in_order_no').value || '---';
    document.getElementById('pr_order_date').innerText = formatDate(document.getElementById('in_order_date').value);
    document.getElementById('pr_vehicle').innerText = document.getElementById('in_vehicle').value || '---';
    document.getElementById('pr_place').innerText = document.getElementById('in_place').value || '---';
    document.getElementById('pr_buyer').innerText = document.getElementById('in_buyer').value || '';

    // Items
    const rows = document.querySelectorAll('.item-row-input');
    const tableBody = document.getElementById('pr_items_body');
    tableBody.innerHTML = '';
    
    let total = 0;

    rows.forEach(row => {
        const desc = row.querySelector('.item-desc').value;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        const per = row.querySelector('.item-per').value;
        const amount = qty * rate;
        total += amount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${desc}</td>
            <td>${qty.toFixed(2)}</td>
            <td>${rate}</td>
            <td>${per}</td>
            <td>${amount.toFixed(2)} /-</td>
        `;
        tableBody.appendChild(tr);
    });

    // Fill empty rows to maintain layout (if less than 5 items)
    for (let i = rows.length; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>&nbsp;</td><td></td><td></td><td></td><td></td>`;
        tableBody.appendChild(tr);
    }

    document.getElementById('pr_total_amount').innerText = total.toFixed(2) + ' /-';
    document.getElementById('pr_amount_words').innerText = total > 0 ? numToHindiWords(Math.round(total)) + ' रुपये मात्र' : '';
}

function formatDate(dateStr) {
    if (!dateStr) return '---';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

async function downloadPDF() {
    const element = document.getElementById('invoice-capture');
    
    // 1. Save data to database first
    const invoiceData = {
        invoice_no: document.getElementById('pr_invoice_no').innerText,
        customer_name: document.getElementById('in_buyer').value,
        date: document.getElementById('pr_date').innerText,
        total_amount: document.getElementById('pr_total_amount').innerText.replace(',', ''),
        items: [] // You can expand this to include full item list if needed
    };

    try {
        const response = await fetch('/save_invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        });
        const result = await response.json();
        console.log("Database Save:", result.message);
    } catch (err) {
        console.error("Error saving to database:", err);
    }

    // 2. Generate PDF
    const opt = {
        margin: 0,
        filename: `ServeSewa_Bill_${invoiceData.invoice_no}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

// Hindi Number to Words Logic
function numToHindiWords(num) {
    const ones = ['', 'एक', 'दो', 'तीन', 'चार', 'पॉंच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पन्द्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];
    const tens = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];
    
    // Simplifed for demo - can be extended for precise 1-99 mapping
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    
    if (num < 1000) {
        return ones[Math.floor(num / 100)] + ' सौ ' + (num % 100 !== 0 ? numToHindiWords(num % 100) : '');
    }
    
    if (num < 100000) {
        return numToHindiWords(Math.floor(num / 1000)) + ' हजार ' + (num % 1000 !== 0 ? numToHindiWords(num % 1000) : '');
    }
    
    if (num < 10000000) {
        return numToHindiWords(Math.floor(num / 100000)) + ' लाख ' + (num % 100000 !== 0 ? numToHindiWords(num % 100000) : '');
    }
    
    return num.toString(); // Fallback
}

// Initial Call
updatePreview();
