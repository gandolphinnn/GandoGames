import { getRank, PankovTurn, RollValue, successProbability } from "@gandogames/shared/pankov";

/*
 * BEHAVIOUR PARAMETERS:
 *
 * 	high DISTRUST
 * 		Tends to challenge more often, even when the previous declaration
 * 		is likely true.
 *
 * 	high COCKINESS
 * 		Tends to lie more often when it doesn't have to and is more willing
 * 		to accept risky declarations instead of challenging them.
 *
 * 	high LIE_DECISION_CONSISTENCY
 * 		Strongly prefers lies close to the actual roll.
 * 		Low values make the bot more willing to spread its lies across
 * 		the available declarations.
 *
 * 	high LIE_DECISION_AGGRESSIVENESS
 * 		Tends to choose declarations further away from the actual roll.
 * 		Low values favour safer, more believable lies.
 *
 * 	DISTRUST & COCKINESS combined
 * 		If it decided not to call a challenge because the previous declaration
 * 		is likely true, it might still call it if it is not cocky enough to
 * 		accept a risky roll.
 *
 * 		e.g. If the previous declaration is 65 and the beating roll was 31,
 * 		it probably thinks it is true, but the probability to beat a 65 is low
 * 		so a cautious bot might still challenge it.
 */

export class PankovBot {
	public distrust: number;
	public cockiness: number;
	public lieDecisionConsistency: number;
	public lieDecisionAggressiveness: number;

	public constructor(public playerId: string) {
		this.distrust = Math.random();
		this.cockiness = Math.random();
		this.lieDecisionConsistency = Math.random();
		this.lieDecisionAggressiveness = Math.random();
	}

	/**
	 * Decide whether to challenge the previous declaration.
	 */
	public isChallenging(previousTurn: PankovTurn): boolean {
		const declaration = previousTurn.declaration;
		const beatedRoll = previousTurn.beatedRoll ?? 31;

		const probabilityOfLying = 1 - successProbability(declaration, beatedRoll);

		const suspicion = this.distrust * probabilityOfLying;

		/*
		 * A risky declaration deserves additional scrutiny.
		 *
		 * probabilityOfSuccess is the probability that the declaration
		 * could actually have been produced given the previous declaration.
		 *
		 * A cocky bot accepts risky declarations more easily.
		 * A non-cocky bot challenges them more readily.
		 */
		const risk = 1 - successProbability(declaration, beatedRoll);

		const riskModifier = 1 - risk * this.cockiness;

		const challengeProbability = suspicion * riskModifier;

		return Math.random() < challengeProbability;
	}

	/**
	 * The bot CAN be honest but might lie.
	 */
	public decideDeclaration(currentRoll: RollValue, validDeclarations: RollValue[]): RollValue {
		if (Math.random() >= this.cockiness) {
			return currentRoll;
		}

		return this.lie(currentRoll, validDeclarations);
	}

	/**
	 * Decide a random, but weighted, roll to lie with.
	 *
	 * The available declarations are weighted according to:
	 *
	 * 1. Mathematical plausibility
	 * 2. Lie distance from the actual roll
	 * 3. The bot's consistency
	 * 4. The bot's aggressiveness
	 */
	public lie(currentRoll: RollValue, validDeclarations: RollValue[]): RollValue {
		const possibleLies = validDeclarations.filter(
			value => getRank(value) >= getRank(currentRoll),
		);

		/*
		 * There is no possible lie.
		 *
		 * This can happen when the current roll is already the highest
		 * possible declaration.
		 */
		if (possibleLies.length === 0)
			return currentRoll;

		const weights = this.buildWeights(possibleLies, currentRoll);

		return this.weightedRandom(possibleLies, weights);
	}

	private buildWeights(possibleLies: RollValue[], currentRoll: RollValue) {
		return possibleLies.map((declaration, index) => {
			/*
			 * Normalized distance from the actual roll.
			 *
			 * 0 = closest possible lie
			 * 1 = furthest possible lie
			 */
			const distance = possibleLies.length === 1 ? 0 : index / (possibleLies.length - 1);

			/*
			 * How believable is this declaration mathematically?
			 *
			 * A declaration which is easier to obtain gets a higher weight.
			 */
			const plausibility = successProbability(declaration, currentRoll);

			/*
			 * Consistency controls how strongly the bot favours
			 * declarations close to the actual roll.
			 *
			 * At consistency = 0:
			 * 		almost no additional preference.
			 *
			 * At consistency = 1:
			 * 		strong preference for nearby declarations.
			 */
			const consistency = Math.pow(1 - distance, 1 + this.lieDecisionConsistency * 4);

			/*
			 * Aggressiveness shifts the distribution towards higher lies.
			 *
			 * At aggressiveness = 0:
			 * 		no additional preference for ambitious lies.
			 *
			 * At aggressiveness = 1:
			 * 		strong preference for distant lies.
			 */
			const aggressiveness = Math.pow(distance, 1 + (1 - this.lieDecisionAggressiveness) * 4);

			/*
			 * Blend consistency and aggressiveness.
			 *
			 * Aggressiveness decides where the bot wants to lie.
			 * Consistency decides how concentrated that preference is.
			 */
			const behaviouralWeight = (1 - this.lieDecisionAggressiveness) * consistency + this.lieDecisionAggressiveness * aggressiveness;

			/*
			 * Mathematical plausibility remains important, but personality
			 * can override it.
			 *
			 * The small epsilon prevents a declaration from becoming
			 * mathematically impossible to select.
			 */
			const weight = Math.max(plausibility, 0.01) * Math.max(behaviouralWeight, 0.01);
			return weight;
		});
	}

	/**
	 * Select a random item based on its relative weight.
	 */
	private weightedRandom(items: RollValue[], weights: number[]): RollValue {
		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

		let random = Math.random() * totalWeight;

		for (let i = 0; i < items.length; i++) {
			random -= weights[i];

			if (random <= 0)
				return items[i];
		}

		return items[items.length - 1];
	}
}