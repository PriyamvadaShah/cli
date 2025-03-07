import Command from '../../core/base';
import { load } from '../../core/models/SpecificationFile';
import { formatOutput, parse, ValidateOptions } from '../../core/parser';
import { cancel, intro, isCancel, select, text } from '@clack/prompts';
import { inverse } from 'picocolors';
import { generateModels, Languages, ModelinaArgs } from '@asyncapi/modelina-cli';
import { modelsFlags } from '../../core/flags/generate/models.flags';
import { proxyFlags } from '../../core/flags/proxy.flags';
import { ProgressIndicator } from '../../core/utils/progress';

export default class Models extends Command {
  static description = 'Generates typed models';

  static readonly args = ModelinaArgs as any;

  static readonly flags = {
    ...modelsFlags(),
    ...proxyFlags(),
  };

  async run() {
    const { args, flags } = await this.parse(Models);
    let { language, file} = args;
    let { output } = flags;
    const {proxyPort, proxyHost, verbose} = flags;

    const interactive = !flags['no-interactive'];
    const progress = new ProgressIndicator(verbose);

    if (!interactive) {
      intro(inverse('AsyncAPI Generate Models'));

      const parsedArgs = await this.parseArgs(args, output);
      language = parsedArgs.language;
      file = parsedArgs.file;
      output = parsedArgs.output;
    }

    if (proxyHost && proxyPort) {
      const proxyUrl = `http://${proxyHost}:${proxyPort}`;
      file = `${file}+${proxyUrl}`;
    }
    
    progress.startSpinner('Loading AsyncAPI document...');
    const inputFile = (await load(file)) || (await load());
    progress.succeedSpinner('AsyncAPI document loaded successfully');

    progress.startSpinner('Parsing document...');
    const { document, diagnostics, status } = await parse(this, inputFile, flags as ValidateOptions);
    
    if (!document || status === 'invalid') {
      progress.failSpinner('Failed to parse AsyncAPI document');
      const severityErrors = diagnostics.filter((obj) => obj.severity === 0);
      this.log(`Input is not a correct AsyncAPI document so it cannot be processed.${formatOutput(severityErrors,'stylish','error')}`);
      return;
    }
    progress.succeedSpinner('AsyncAPI document parsed successfully');

    const logger = {
      info: (message: string) => {
        this.log(message);
      },
      debug: (message: string) => {
        this.debug(message);
      },
      warn: (message: string) => {
        this.warn(message);
      },
      error: (message: string) => {
        this.error(message);
      },
    };

    progress.startSpinner('Generating models...');
    try {
      const generatedModels = await generateModels({...flags, output}, document, logger, language as Languages);
      if (output && output !== 'stdout') {
        const generatedModelStrings = generatedModels.map((model) => { return model.modelName; });
        progress.succeedSpinner(`Successfully generated the following models: ${generatedModelStrings.join(', ')}`);
        return;
      }
      const generatedModelStrings = generatedModels.map((model) => {
        return `
  ## Model name: ${model.modelName}
  ${model.result}
        `;
      });
      progress.succeedSpinner(`Successfully generated the following models: ${generatedModelStrings.join('\n')}`);
    } catch (error) {
      progress.failSpinner('Failed to generate models'); 

      if (error instanceof Error) {
        this.error(error.message);
      } else {
        this.error('An unknown error occurred during model generation.');
      }
    }    
  }

  private async parseArgs(args: Record<string, any>, output?: string) {
    let { language, file } = args;
    let askForOutput = false;
    const operationCancelled = 'Operation cancelled by the user.';
    if (!language) {
      language = await select({
        message: 'Select the language you want to generate models for',
        options: Object.keys(Languages).map((key) =>
          ({ value: key, label: key, hint: Languages[key as keyof typeof Languages] })
        ),
      });

      askForOutput = true;
    }

    if (isCancel(language)) {
      cancel(operationCancelled);
      this.exit();
    }

    if (!file) {
      file = await text({
        message: 'Enter the path or URL to the AsyncAPI document',
        defaultValue: 'asyncapi.yaml',
        placeholder: 'asyncapi.yaml',
      });

      askForOutput = true;
    }

    if (isCancel(file)) {
      cancel(operationCancelled);
      this.exit();
    }

    if (!output && askForOutput) {
      output = await text({
        message: 'Enter the output directory or stdout to write the models to',
        defaultValue: 'stdout',
        placeholder: 'stdout',
      }) as string;
    }

    if (isCancel(output)) {
      cancel(operationCancelled);
      this.exit();
    }

    return { language, file, output: output ?? 'stdout' };
  }
}
