import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.image('mario', 'mario.png'); // Assure you have a mario.png image
}

function create() {
    this.mario = this.add.sprite(100, 450, 'mario').setCollideWorldBounds(true);
    this.physics.add.collider(this.mario, this.physics.world.bounds);
}

function update() {
    const cursors = this.input.keyboard.createCursorKeys();
    if (cursors.left.isDown) {
        this.mario.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        this.mario.setVelocityX(160);
    } else {
        this.mario.setVelocityX(0);
    }
}