class Game {
    constructor() {
        this.board = []; // 10x9 grid
        this.turn = 'red'; // 'red' or 'black'
        this.selectedPiece = null;
        this.gameOver = false;
        this.ai = new AI(this);
        this.difficulty = 2;
    }

    init() {
        this.initBoard();
        this.renderBoard();
    }

    initBoard() {
        // Initialize 10x9 board with null
        this.board = Array(10).fill(null).map(() => Array(9).fill(null));
        this.pieceIdCounter = 0; // Unique ID for DOM syncing

        // Setup pieces
        const setup = [
            ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'], // 0: Black back rank
            [null, null, null, null, null, null, null, null, null],
            [null, 'c', null, null, null, null, null, 'c', null], // 2: Black cannons
            ['p', null, 'p', null, 'p', null, 'p', null, 'p'], // 3: Black pawns
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            ['P', null, 'P', null, 'P', null, 'P', null, 'P'], // 6: Red pawns
            [null, 'C', null, null, null, null, null, 'C', null], // 7: Red cannons
            [null, null, null, null, null, null, null, null, null],
            ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R']  // 9: Red back rank
        ];

        // Map characters to piece objects
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const char = setup[r][c];
                if (char) {
                    const color = (char === char.toUpperCase()) ? 'red' : 'black';
                    const type = char.toLowerCase();
                    this.board[r][c] = {
                        type,
                        color,
                        r,
                        c,
                        id: `piece-${this.pieceIdCounter++}`
                    };
                }
            }
        }
    }

    renderBoard() {
        const boardEl = document.getElementById('board');

        // We don't clear boardEl.innerHTML anymore to preserve transitions.
        // Instead, we sync pieces.

        // 1. Mark all existing pieces in DOM as "to remove" initially
        const existingEls = Array.from(boardEl.querySelectorAll('.piece'));
        const activeIds = new Set();

        // 2. Update or Create pieces from board state
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    activeIds.add(piece.id);
                    let pieceEl = document.getElementById(piece.id);

                    if (!pieceEl) {
                        // Create new
                        pieceEl = document.createElement('div');
                        pieceEl.id = piece.id;
                        pieceEl.className = `piece ${piece.color}`;
                        pieceEl.textContent = this.getPieceChar(piece.type, piece.color);
                        pieceEl.onclick = (e) => {
                            e.stopPropagation();
                            this.handlePieceClick(piece.r, piece.c); // Use current coords
                        };
                        boardEl.appendChild(pieceEl);
                    }

                    // Update position
                    // Note: piece.r and piece.c might be stale if we rely on closure in onclick?
                    // No, handlePieceClick looks up this.board[r][c]. 
                    // Wait, if we pass r,c to onclick, they are bound at creation.
                    // We need to look up the piece's current position or update the handler?
                    // Better: handlePieceClick uses the piece's internal r/c? 
                    // Or just find the piece in the board array?
                    // Let's update the onclick handler to use the CURRENT r, c from the loop? 
                    // No, the loop runs every render. So updating onclick is fine.
                    pieceEl.onclick = (e) => {
                        e.stopPropagation();
                        this.handlePieceClick(piece.r, piece.c);
                    };

                    pieceEl.style.left = `${25 + piece.c * 50 - 20}px`;
                    pieceEl.style.top = `${25 + piece.r * 50 - 20}px`;

                    // Selection state
                    if (this.selectedPiece && this.selectedPiece.id === piece.id) {
                        pieceEl.classList.add('selected');
                    } else {
                        pieceEl.classList.remove('selected');
                    }
                }
            }
        }

        // 3. Remove pieces that are no longer on the board (captured)
        // But we want to animate them!
        // If a piece is in existingEls but NOT in activeIds, it was captured.
        existingEls.forEach(el => {
            if (!activeIds.has(el.id)) {
                if (!el.classList.contains('captured')) {
                    el.classList.add('captured');
                    // Remove after animation
                    setTimeout(() => {
                        if (el.parentNode) el.parentNode.removeChild(el);
                    }, 500); // Match CSS animation duration
                }
            }
        });

        // Ensure global click handler exists (idempotent)
        if (!boardEl.onclick) {
            boardEl.onclick = (e) => {
                const rect = boardEl.getBoundingClientRect();
                const x = e.clientX - rect.left - 25;
                const y = e.clientY - rect.top - 25;
                const c = Math.round(x / 50);
                const r = Math.round(y / 50);

                if (r >= 0 && r < 10 && c >= 0 && c < 9) {
                    this.handleSquareClick(r, c);
                }
            };
        }
    }

    getPieceChar(type, color) {
        const chars = {
            'k': { red: '帥', black: '將' },
            'a': { red: '仕', black: '士' },
            'b': { red: '相', black: '象' },
            'n': { red: '傌', black: '馬' },
            'r': { red: '俥', black: '車' },
            'c': { red: '炮', black: '包' },
            'p': { red: '兵', black: '卒' }
        };
        return chars[type][color];
    }

    handlePieceClick(r, c) {
        if (this.gameOver) return;
        const piece = this.board[r][c];

        // Sanity check: is piece actually there?
        if (!piece) return;

        if (piece.color === this.turn) {
            this.selectPiece(r, c);
        } else {
            if (this.selectedPiece) {
                this.tryMove(this.selectedPiece.r, this.selectedPiece.c, r, c);
            }
        }
    }

    handleSquareClick(r, c) {
        if (this.gameOver) return;
        if (this.selectedPiece) {
            this.tryMove(this.selectedPiece.r, this.selectedPiece.c, r, c);
        }
    }

    selectPiece(r, c) {
        this.selectedPiece = this.board[r][c];
        this.renderBoard();
    }

    tryMove(fromR, fromC, toR, toC) {
        if (this.isValidMove(fromR, fromC, toR, toC)) {
            // Simulate move to check for self-check
            const captured = this.board[toR][toC];
            const piece = this.board[fromR][fromC];

            this.board[toR][toC] = piece;
            this.board[fromR][fromC] = null;
            piece.r = toR;
            piece.c = toC;

            const inCheck = this.isCheck(this.turn);

            // Undo move
            this.board[fromR][fromC] = piece;
            this.board[toR][toC] = captured;
            piece.r = fromR;
            piece.c = fromC;

            if (inCheck) {
                console.log("Cannot move into check");
                // Optional: Visual feedback shake
                const pieceEl = document.getElementById(piece.id);
                if (pieceEl) {
                    pieceEl.style.transform = "translateX(5px)";
                    setTimeout(() => pieceEl.style.transform = "translateX(-5px)", 50);
                    setTimeout(() => pieceEl.style.transform = "none", 100);
                }
                return;
            }

            // Real move
            // If capturing, add visual effect to attacker?
            if (captured) {
                const attackerEl = document.getElementById(piece.id);
                if (attackerEl) attackerEl.classList.add('capturing');
                setTimeout(() => attackerEl && attackerEl.classList.remove('capturing'), 300);
            }

            this.makeMove(fromR, fromC, toR, toC);
            this.turn = (this.turn === 'red') ? 'black' : 'red';
            this.selectedPiece = null;

            // Check game state
            if (this.isCheck(this.turn)) {
                if (this.isCheckmate(this.turn)) {
                    this.gameOver = true;
                    this.renderBoard();
                    this.updateStatus(`將軍！${(this.turn === 'red' ? '黑方' : '紅方')}勝！`);
                    return;
                }
            } else if (this.isStalemate(this.turn)) {
                this.gameOver = true;
                this.renderBoard();
                this.updateStatus("和棋！");
                return;
            }

            this.renderBoard();
            this.updateStatus();

            if (!this.gameOver && this.turn === 'black') {
                setTimeout(() => this.ai.makeMove(), 600); // Slightly longer delay for animation
            }
        }
    }

    makeMove(fromR, fromC, toR, toC) {
        const piece = this.board[fromR][fromC];
        this.board[toR][toC] = piece;
        this.board[fromR][fromC] = null;
        piece.r = toR;
        piece.c = toC;
    }

    isValidMove(fromR, fromC, toR, toC) {
        if (fromR === toR && fromC === toC) return false;
        if (toR < 0 || toR > 9 || toC < 0 || toC > 8) return false;

        const piece = this.board[fromR][fromC];
        const target = this.board[toR][toC];

        if (target && target.color === piece.color) return false;

        const dr = toR - fromR;
        const dc = toC - fromC;
        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);

        switch (piece.type) {
            case 'k':
                if ((absDr + absDc) !== 1) return false;
                if (toC < 3 || toC > 5) return false;
                if (piece.color === 'red') {
                    if (toR < 7) return false;
                } else {
                    if (toR > 2) return false;
                }
                return true;

            case 'a':
                if (absDr !== 1 || absDc !== 1) return false;
                if (toC < 3 || toC > 5) return false;
                if (piece.color === 'red') {
                    if (toR < 7) return false;
                } else {
                    if (toR > 2) return false;
                }
                return true;

            case 'b':
                if (absDr !== 2 || absDc !== 2) return false;
                if (piece.color === 'red') {
                    if (toR < 5) return false;
                } else {
                    if (toR > 4) return false;
                }
                const eyeR = fromR + dr / 2;
                const eyeC = fromC + dc / 2;
                if (this.board[eyeR][eyeC]) return false;
                return true;

            case 'n':
                if (!((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2))) return false;
                if (absDr === 2) {
                    const legR = fromR + dr / 2;
                    if (this.board[legR][fromC]) return false;
                } else {
                    const legC = fromC + dc / 2;
                    if (this.board[fromR][legC]) return false;
                }
                return true;

            case 'r':
                if (fromR !== toR && fromC !== toC) return false;
                if (!this.isPathClear(fromR, fromC, toR, toC)) return false;
                return true;

            case 'c':
                if (fromR !== toR && fromC !== toC) return false;
                const count = this.countPiecesBetween(fromR, fromC, toR, toC);
                if (target) {
                    if (count !== 1) return false;
                } else {
                    if (count !== 0) return false;
                }
                return true;

            case 'p':
                if ((absDr + absDc) !== 1) return false;
                if (piece.color === 'red') {
                    if (toR > fromR) return false;
                    if (fromR >= 5 && fromR === toR) return false;
                } else {
                    if (toR < fromR) return false;
                    if (fromR <= 4 && fromR === toR) return false;
                }
                return true;
        }
        return false;
    }

    isPathClear(r1, c1, r2, c2) {
        return this.countPiecesBetween(r1, c1, r2, c2) === 0;
    }

    countPiecesBetween(r1, c1, r2, c2) {
        let count = 0;
        if (r1 === r2) {
            const minC = Math.min(c1, c2);
            const maxC = Math.max(c1, c2);
            for (let c = minC + 1; c < maxC; c++) {
                if (this.board[r1][c]) count++;
            }
        } else {
            const minR = Math.min(r1, r2);
            const maxR = Math.max(r1, r2);
            for (let r = minR + 1; r < maxR; r++) {
                if (this.board[r][c1]) count++;
            }
        }
        return count;
    }

    // Check if Generals are facing each other with no pieces in between
    generalsFacing() {
        let redK, blackK;
        for (let r = 0; r < 10; r++) {
            for (let c = 3; c <= 5; c++) {
                const p = this.board[r][c];
                if (p && p.type === 'k') {
                    if (p.color === 'red') redK = { r, c };
                    else blackK = { r, c };
                }
            }
        }

        if (redK && blackK && redK.c === blackK.c) {
            if (this.countPiecesBetween(redK.r, redK.c, blackK.r, blackK.c) === 0) {
                return true;
            }
        }
        return false;
    }

    isCheck(color) {
        // Find King
        let king = null;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const p = this.board[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    king = p;
                    break;
                }
            }
            if (king) break;
        }

        if (!king) return true; // Should not happen, but if King missing, it's bad

        // Check if any enemy piece can attack King
        const enemyColor = (color === 'red') ? 'black' : 'red';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const p = this.board[r][c];
                if (p && p.color === enemyColor) {
                    if (this.isValidMove(r, c, king.r, king.c)) {
                        return true;
                    }
                }
            }
        }

        // Also check Flying General rule here? 
        // Technically Flying General is an illegal state, not just "check".
        // But if we treat it as being attacked by the other King, it fits `isCheck`.
        if (this.generalsFacing()) return true;

        return false;
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    for (let tr = 0; tr < 10; tr++) {
                        for (let tc = 0; tc < 9; tc++) {
                            if (this.isValidMove(r, c, tr, tc)) {
                                // Simulate
                                const target = this.board[tr][tc];
                                this.board[tr][tc] = piece;
                                this.board[r][c] = null;
                                const oldR = piece.r;
                                const oldC = piece.c;
                                piece.r = tr;
                                piece.c = tc;

                                const inCheck = this.isCheck(color);

                                // Undo
                                this.board[r][c] = piece;
                                this.board[tr][tc] = target;
                                piece.r = oldR;
                                piece.c = oldC;

                                if (!inCheck) {
                                    moves.push({ fromR: r, fromC: c, toR: tr, toC: tc });
                                }
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    isCheckmate(color) {
        if (!this.isCheck(color)) return false;
        return this.getAllValidMoves(color).length === 0;
    }

    isStalemate(color) {
        if (this.isCheck(color)) return false;
        return this.getAllValidMoves(color).length === 0;
    }

    updateStatus(msg) {
        const statusEl = document.getElementById('status');
        if (msg) {
            statusEl.textContent = msg;
        } else {
            if (this.isCheck(this.turn)) {
                statusEl.textContent = (this.turn === 'red') ? "紅方將軍!" : "黑方將軍!";
            } else {
                statusEl.textContent = (this.turn === 'red') ? "紅方走棋" : "黑方思考中...";
            }
        }
    }

    reset() {
        this.turn = 'red';
        this.gameOver = false;
        this.selectedPiece = null;
        this.initBoard();
        this.renderBoard();
        this.updateStatus();
    }

    setDifficulty(level) {
        this.difficulty = level;
    }
}
