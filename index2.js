const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');

const app = express();
const port = 4000;
const cors = require('cors');

// Permitir todas as origens (ou pode especificar sua URL específica)
app.use(cors());


// Configurar body-parser
app.use(bodyParser.json());

// Configurar autenticação com Google Sheets API
const auth = new google.auth.GoogleAuth({
    keyFile: 'pontoslocalizar-b102dee6562a.json', // Substitua pelo caminho do seu arquivo de credenciais
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ID da Planilha do Google
const spreadsheetId = '1w-0dKtN0Zmb2uO5I7fxDhhtTNlPwPbuzM5kT5dBL2-E';

// Rota para registrar ponto
app.post('/register', async (req, res) => {
    const { action, timestamp } = req.body;

    if (!action || !timestamp) {
        return res.status(400).send('Dados inválidos.');
    }

    try {
        // Adicionar linha na planilha
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Página1!A:E',
            valueInputOption: 'RAW',
            resource: {
                values: [[new Date().toLocaleDateString(), action === 'Entrada' ? timestamp : '', action === 'Saída Almoço' ? timestamp : '', action === 'Entrada Almoço' ? timestamp : '', action === 'Saída' ? timestamp : '']],
            },
        });

        res.status(200).send('Registro salvo com sucesso.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao salvar o registro.');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
