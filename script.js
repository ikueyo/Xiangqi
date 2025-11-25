document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();

    document.getElementById('new-game-btn').addEventListener('click', () => {
        game.reset();
    });

    document.getElementById('difficulty').addEventListener('change', (e) => {
        game.setDifficulty(parseInt(e.target.value));
    });
});
