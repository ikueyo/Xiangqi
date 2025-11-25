class AI {
    constructor(game) {
        this.game = game;
        this.pieceValues = {
            'k': 10000,
            'r': 900,
            'n': 400,
            'c': 450,
            'a': 20,
            'b': 20,
            'p': 10
        };
        // Position bonuses could be added for better AI
    }

    makeMove() {
        const depth = this.game.difficulty; // 1, 2, or 3
        // Use a slightly higher depth for simple difficulty to avoid completely random moves, 
        // but maybe limit search space? 
        // Actually, depth 2 is fast, depth 3 is okay.
        // Let's map difficulty to depth: 1->2, 2->3, 3->4
        const searchDepth = this.game.difficulty + 1;

        const bestMove = this.minimaxRoot(searchDepth, 'black');
        if (bestMove) {
            this.game.makeMove(bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC);
            this.game.turn = 'red';

            // Check game state after AI move
            if (this.game.isCheck('red')) {
                if (this.game.isCheckmate('red')) {
                    this.game.gameOver = true;
                    this.game.renderBoard();
                    this.game.updateStatus("Checkmate! Black Wins!");
                    return;
                }
            } else if (this.game.isStalemate('red')) {
                this.game.gameOver = true;
                this.game.renderBoard();
                this.game.updateStatus("Stalemate!");
                return;
            }

            this.game.renderBoard();
            this.game.updateStatus();
        } else {
            console.log("AI cannot move (Resign?)");
        }
    }

    minimaxRoot(depth, color) {
        const moves = this.game.getAllValidMoves(color);
        let bestMove = null;
        let bestValue = -Infinity;

        // Sort moves to improve alpha-beta pruning? 
        // Captures first is a good heuristic.

        for (const move of moves) {
            // Simulate
            const piece = this.game.board[move.fromR][move.fromC];
            const target = this.game.board[move.toR][move.toC];

            this.game.board[move.toR][move.toC] = piece;
            this.game.board[move.fromR][move.fromC] = null;
            piece.r = move.toR;
            piece.c = move.toC;

            const value = this.minimax(depth - 1, -Infinity, Infinity, false);

            // Undo
            this.game.board[move.fromR][move.fromC] = piece;
            this.game.board[move.toR][move.toC] = target;
            piece.r = move.fromR;
            piece.c = move.fromC;

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluateBoard('black');
        }

        const color = isMaximizing ? 'black' : 'red';
        const moves = this.game.getAllValidMoves(color);

        if (moves.length === 0) {
            // Checkmate or Stalemate
            if (this.game.isCheck(color)) {
                return isMaximizing ? -100000 : 100000;
            }
            return 0; // Stalemate
        }

        if (isMaximizing) {
            let bestValue = -Infinity;
            for (const move of moves) {
                const piece = this.game.board[move.fromR][move.fromC];
                const target = this.game.board[move.toR][move.toC];

                this.game.board[move.toR][move.toC] = piece;
                this.game.board[move.fromR][move.fromC] = null;
                piece.r = move.toR;
                piece.c = move.toC;

                const value = this.minimax(depth - 1, alpha, beta, false);

                this.game.board[move.fromR][move.fromC] = piece;
                this.game.board[move.toR][move.toC] = target;
                piece.r = move.fromR;
                piece.c = move.fromC;

                bestValue = Math.max(bestValue, value);
                alpha = Math.max(alpha, bestValue);
                if (beta <= alpha) {
                    break;
                }
            }
            return bestValue;
        } else {
            let bestValue = Infinity;
            for (const move of moves) {
                const piece = this.game.board[move.fromR][move.fromC];
                const target = this.game.board[move.toR][move.toC];

                this.game.board[move.toR][move.toC] = piece;
                this.game.board[move.fromR][move.fromC] = null;
                piece.r = move.toR;
                piece.c = move.toC;

                const value = this.minimax(depth - 1, alpha, beta, true);

                this.game.board[move.fromR][move.fromC] = piece;
                this.game.board[move.toR][move.toC] = target;
                piece.r = move.fromR;
                piece.c = move.fromC;

                bestValue = Math.min(bestValue, value);
                beta = Math.min(beta, bestValue);
                if (beta <= alpha) {
                    break;
                }
            }
            return bestValue;
        }
    }

    evaluateBoard(color) {
        let score = 0;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.game.board[r][c];
                if (piece) {
                    const value = this.pieceValues[piece.type];
                    if (piece.color === color) {
                        score += value;
                        // Add positional bonuses here if needed
                        if (piece.type === 'p') {
                            // Advanced pawns are better
                            if (color === 'black' && r > 4) score += 20;
                            if (color === 'red' && r < 5) score += 20;
                        }
                    } else {
                        score -= value;
                        if (piece.type === 'p') {
                            if (color === 'black' && r < 5) score -= 20; // Enemy red pawn advanced
                            if (color === 'red' && r > 4) score -= 20; // Enemy black pawn advanced
                        }
                    }
                }
            }
        }
        return score;
    }
}
