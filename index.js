const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000; //isso para rodar em produção 
//const port = 4000; // Isso para rodar em Desenvolvimento

// Permitir todas as origens
app.use(cors());

// Configurar body-parser
app.use(bodyParser.json());

// Configurar autenticação com Google Sheets API
const auth = new google.auth.GoogleAuth({
    keyFile: 'pontoslocalizar-c02251d25869.json', // Substitua pelo caminho do seu arquivo de credenciais
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ID da Planilha do Google
const spreadsheetId = '1w-0dKtN0Zmb2uO5I7fxDhhtTNlPwPbuzM5kT5dBL2-E';

// Rota para registrar ponto
app.post('/register', async (req, res) => {
    let { action, timestamp, latitude, longitude } = req.body;

    // Garantir que latitude e longitude sejam formatadas corretamente
    latitude = latitude.toString().replace(',', '.');
    longitude = longitude.toString().replace(',', '.');

    if (!action || !timestamp || latitude == null || longitude == null) {
        return res.status(400).send('Dados inválidos.');
    }

    const date = new Date(timestamp).toLocaleDateString(); // Obtendo apenas a data (sem hora)
    const time = new Date(timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Hora no fuso horário de Brasília

    try {
        // Verificar se já existe um registro para a data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Página1!A:A', // Coluna A tem as datas
        });

        const rows = response.data.values || [];
        const existingRowIndex = rows.findIndex(row => row[0] === date);

        if (existingRowIndex !== -1) {
            // Se já existe um registro, atualizar a linha correspondente
            const range = `Página1!B${existingRowIndex + 1}:I${existingRowIndex + 1}`;
            const existingRow = rows[existingRowIndex];

            const values = [
                [
                    rows[existingRowIndex][1],  // Manter a Entrada caso já tenha
                    action === 'Saída Almoço' ? time : rows[existingRowIndex][2], // Atualizar Saída Almoço
                    action === 'Entrada Almoço' ? time : rows[existingRowIndex][3], // Atualizar Entrada Almoço
                    action === 'Saída' ? time : rows[existingRowIndex][4], // Atualizar Saída
                    action === 'Entrada' ? latitude : existingRow[5], // Atualizar Latitude de Entrada
                    action === 'Entrada' ? longitude : existingRow[6], // Atualizar Longitude de Entrada
                    action === 'Saída' ? latitude : existingRow[7], // Atualizar Latitude de Saída
                    action === 'Saída' ? longitude : existingRow[8], // Atualizar Longitude de Saída
                ],
            ];

            // Atualizar apenas a célula necessária
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values },
            });

            return res.status(200).send(`${action} registrada com sucesso!`);
        } else {
            // Se não existir, adicionar uma nova linha
            const range = 'Página1!A:I'; // Adicionar uma nova linha
            const values = [
                [
                    date, // Adicionar data na coluna A
                    action === 'Entrada' ? time : '', // Só colocar hora na coluna de Entrada
                    action === 'Saída Almoço' ? time : '', // Só colocar hora na coluna de Saída Almoço
                    action === 'Entrada Almoço' ? time : '', // Só colocar hora na coluna de Entrada Almoço
                    action === 'Saída' ? time : '', // Só colocar hora na coluna de Saída
                    action === 'Entrada' ? latitude : '', // Latitude de Entrada
                    action === 'Entrada' ? longitude : '', // Longitude de Entrada
                    action === 'Saída' ? latitude : '', // Latitude de Saída
                    action === 'Saída' ? longitude : '', // Longitude de Saída
                ],
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
// Trecho alterado 25/01/2025 23:01
app.get('/coordinates', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Página1!A:I', // Intervalo abrangendo todas as colunas necessárias
        });

        const rows = response.data.values || [];

        // Depuração: Verificando todas as linhas
        console.log('Linhas retornadas da planilha:', rows);

        if (rows.length === 0) {
            return res.status(404).send('Nenhum registro encontrado.');
        }

        // Mapeando as coordenadas, ignorando a primeira linha de cabeçalho
        const coordinates = rows.slice(1).map(row => {
            console.log('Linha analisada:', row); // Exibir cada linha para depuração

            return {
                date: row[0] || 'N/A', // Data
                entryLatitude: row[5] || 'N/A', // Latitude de Entrada (Coluna F)
                entryLongitude: row[6] || 'N/A', // Longitude de Entrada (Coluna G)
                exitLatitude: row[7] || 'N/A', // Latitude de Saída (Coluna H)
                exitLongitude: row[8] || 'N/A', // Longitude de Saída (Coluna I)
            };
        });

        // Verificando as coordenadas extraídas
        console.log('Coordenadas extraídas:', coordinates);

        res.status(200).json(coordinates);
    } catch (error) {
        console.error('Erro ao obter coordenadas:', error);
        res.status(500).send('Erro ao obter coordenadas.');
    }
});

/*
// Rota para obter coordenadas de entrada e saída
app.get('/coordinates', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Página1!A:I', // Ajuste o intervalo para cobrir as colunas necessárias
        });

        const rows = response.data.values || [];
        if (rows.length === 0) {
            return res.status(404).send('Nenhum registro encontrado.');
        }

        // Mapear registros com coordenadas de entrada e saída
        const coordinates = rows.slice(1).map(row => ({
            date: row[0] || 'N/A', // Data
            entryLatitude: row[5] || 'N/A', // Latitude de Entrada
            entryLongitude: row[6] || 'N/A', // Longitude de Entrada
            exitLatitude: row[7] || 'N/A', // Latitude de Saída
            exitLongitude: row[8] || 'N/A', // Longitude de Saída
        }));

        res.status(200).json(coordinates);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao obter coordenadas.');
    }
}); */
/*
// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`); */

// Testando Servidor
app.get('/', (req, res) => {
    res.send('Servidor funcionando! Este é o endpoint raiz.');
});


// Rota para qualquer outra página
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
// Rota para qualquer outra página
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'seu-diretorio')));
    
// Iniciar o servidor Produção
/* app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em https://pontos.onrender.com/:${port}`); 
}); */

    app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

