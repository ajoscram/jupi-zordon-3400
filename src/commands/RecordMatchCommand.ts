import { Command } from "../core/abstractions";
import { BotError, Context, Fetcher } from "../core/concretions";
import { CompletedMatch, OngoingMatch, Server, Summoner } from "../core/model";

export class RecordMatchCommand extends Command{
    private static readonly AWAIT_MILLISECONDS = 30000;
    private static readonly MAX_LOOPS = 240;

    constructor(options: string[]){
        super(options);
    }

    public async execute(context: Context): Promise<void> {
        const summoner: Summoner = await this.getSummoner(context);
        const server: Server = context.message.getServer();

        const ongoingMatch: OngoingMatch = await context.fetcher.getOngoingMatch(summoner, server);
        const probabilityBlueWins: number = await context.predictor.predict(ongoingMatch);
        await context.database.insert(ongoingMatch);
        context.message.reply(ongoingMatch, probabilityBlueWins);

        const completedMatch: CompletedMatch = await this.waitForMatch(ongoingMatch, context.fetcher);
        await context.database.insert(completedMatch);
        context.message.reply(completedMatch);
    }

    private async waitForMatch(ongoingMatch: OngoingMatch, fetcher: Fetcher): Promise<CompletedMatch>{
        let match: CompletedMatch = null;
        let loops: number = RecordMatchCommand.MAX_LOOPS        
        const timerId: number = setInterval(
            async () => {
                match = await this.tryGetMatch(ongoingMatch, fetcher);
                loops--;
            },
            RecordMatchCommand.AWAIT_MILLISECONDS
        );

        while(loops > 0 && !match) { }
        clearInterval(timerId);
        if(!match)
            throw new BotError(`The bot was unable to retrieve match with ID: ${ongoingMatch.id}. Operation timed out :(`);
        return match;
    }

    private async tryGetMatch(ongoingMatch: OngoingMatch, fetcher: Fetcher): Promise<CompletedMatch>
    {
        try {
            return await fetcher.getCompletedMatch(ongoingMatch);
        }
        catch(error) {
            if (error instanceof BotError)
                return null;
        }
    }
}