// src/utils/progress.ts

import ora from 'ora';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

export class ProgressIndicator {
  private spinner: any;
  private progressBar: any;
  private isVerbose: boolean;

  constructor(verbose = false) {
    this.isVerbose = verbose;
  }

  /**
   * Start a spinner for operations with unknown completion time
   * @param text Text to display next to the spinner
   */
  startSpinner(text: string): void {
    if (this.isVerbose) {
      this.spinner = ora(text).start();
    } else {
      console.log(text);
    }
  }

  /**
   * Update spinner text
   * @param text New text to display
   */
  updateSpinnerText(text: string): void {
    if (this.isVerbose && this.spinner) {
      this.spinner.text = text;
    } else if (!this.isVerbose) {
      console.log(text);
    }
  }

  /**
   * Stop spinner with success message
   * @param text Success message
   */
  succeedSpinner(text: string): void {
    if (this.isVerbose && this.spinner) {
      this.spinner.succeed(text);
    } else {
      console.log(chalk.green('✓ ') + text);
    }
  }

  /**
   * Stop spinner with failure message
   * @param text Failure message
   */
  failSpinner(text: string): void {
    if (this.isVerbose && this.spinner) {
      this.spinner.fail(text);
    } else {
      console.log(chalk.red('✗ ') + text);
    }
  }

  /**
   * Start a progress bar for operations with known steps
   * @param total Total number of steps
   * @param startText Initial text
   */
  startProgressBar(total: number, startText = 'Processing'): void {
    if (this.isVerbose) {
      this.progressBar = new cliProgress.SingleBar({
        format: `${startText} |${chalk.cyan('{bar}')}| {percentage}% || {value}/{total} steps`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
      }, cliProgress.Presets.shades_classic);
      
      this.progressBar.start(total, 0);
    } else {
      console.log(`${startText} (0/${total})`);
    }
  }

  /**
   * Update progress bar
   * @param current Current step
   * @param text Optional text update
   */
  updateProgressBar(current: number, text?: string): void {
    if (this.isVerbose && this.progressBar) {
      if (text) {
        this.progressBar.format = `${text} |${chalk.cyan('{bar}')}| {percentage}% || {value}/{total} steps`;
      }
      this.progressBar.update(current);
    }
  }

  /**
   * Stop progress bar
   * @param completionText Text to show on completion
   */
  stopProgressBar(completionText?: string): void {
    if (this.isVerbose && this.progressBar) {
      this.progressBar.stop();
      if (completionText) {
        console.log(chalk.green('✓ ') + completionText);
      }
    } else if (completionText) {
      console.log(chalk.green('✓ ') + completionText);
    }
  }
}
