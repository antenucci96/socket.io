function Card(card)
{
    if (card) {
        this.suit = card.suit;
        this.value = card.value;
        this.id = card.id;
        this.new_value = card.new_value;
    }
}

Card.prototype.get_suit = function() {
    return this.suit
}

function CardsGroup(type, id, owners)
{
    this.type = type;
    this.id = id;
    this.owners = owners;
    this.covered = true;
    this.side_cards = [];
}
CardsGroup.prototype = new Array;

CardsGroup.prototype.toObject = function()
{
    return {
        "id": this.id,
        "type": this.type,
        "owners": this.owners,
        "covered": this.covered,
        "length": this.length,
        "side_cards": this.side_cards
    }
}

function background() {
    mainBackground = new creatajs.Bitmap("examples/chat/res/tiles-2797094_1280.jpg");
    
}

