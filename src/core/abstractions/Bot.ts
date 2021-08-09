import { Command, Message } from ".";
import { Context, BotError, ErrorCode } from "../concretions";
import { CommandFactory } from "../concretions/commands/creation";
import { Logger } from "../concretions/logging";

export abstract class Bot{
    private readonly commandFactory: CommandFactory;

    constructor(commandIdentifier: string){
        this.commandFactory = new CommandFactory(commandIdentifier);
    }

    public abstract initialize(): Promise<void>;
    public abstract run(): Promise<void>;
    protected abstract getContext(message: Message): Context;

    protected async process(message: Message): Promise<void>{
        try{
            const command: Command | null = this.commandFactory.tryCreateCommand(message);
            await command?.execute(this.getContext(message));
        }
        catch(error){
            this.handleError(error, message);
        }
    }

    private handleError(error: any, message: Message): void{
        if(!(error instanceof Error))
            error = new Error("Someone was stupid enough to throw this: " + error);

        if(!(error instanceof BotError))
            error = new BotError(ErrorCode.UNKNOWN, error);
            
        Logger.logError(error.inner?.message);
        message.replyWithError(error.code);
    }
}