The whole game logic is in the lib folder: it contains all the games classes, components

It also contains the api interfaces for requests and responses


The api is just a middleman btween the site and the playfab.
It just read and write the game state from/to the playfab, process it using the abstract class Game,