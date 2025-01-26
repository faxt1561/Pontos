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

    const date = new Date(timestamp).toLocaleDateString(); // Obtendo apenas a data (sem hora)
    const time = new Date(timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Obtendo apenas a hora no fuso horário de Brasília

    try {
        // Verificar se já existe um registro para a data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Página1!A:A', // Coluna A tem as datas
        });

        const rows = response.data.values || [];
        const existingRowIndex = rows.findIndex(row => row[0] === date); // Procurar pela data

        if (existingRowIndex !== -1) {
            // Se já existe um registro, atualizar a linha correspondente
            const range = `Página1!B${existingRowIndex + 1}:F${existingRowIndex + 1}`; // As células B a F (ações) da linha encontrada
            const values = [
                [
                    rows[existingRowIndex][1],  // Manter a Entrada caso já tenha
                    action === 'Saída Almoço' ? time : rows[existingRowIndex][2], // Atualizar Se for Saída Almoço
                    action === 'Entrada Almoço' ? time : rows[existingRowIndex][3], // Atualizar Se for Entrada Almoço
                    action === 'Saída' ? time : rows[existingRowIndex][4] // Atualizar Se for Saída
                ]
            ];

            // Atualizar apenas a célula necessária (não sobrescrever a linha inteira)
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values },
            });

            return res.status(200).send(`${action} registrada com sucesso!`);
        } else {
            // Se não existir, adicionar uma nova linha
            const range = 'Página1!A:E'; // Adicionar uma nova linha
            const values = [
                [date, // Adicionar data na coluna A
                 action === 'Entrada' ? time : '', // Só colocar hora na coluna de Entrada
                 action === 'Saída Almoço' ? time : '', // Só colocar hora na coluna de Saída Almoço
                 action === 'Entrada Almoço' ? time : '', // Só colocar hora na coluna de Entrada Almoço
                 action === 'Saída' ? time : ''] // Só colocar hora na coluna de Saída
            ];

            // Adicionar nova linha na planilha
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values },
            });

            return res.status(200).send(`${action} registrada com sucesso!`);
        }

    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao salvar o registro.');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
