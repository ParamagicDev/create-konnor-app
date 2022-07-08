#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import shell from 'shelljs';
import * as ejs from 'ejs';
import * as url from 'url';

interface TemplateData {
  projectName: string
}

interface CliOptions {
  projectName: string
  templateName: string
  templatePath: string
  targetPath: string
}


const __filename = path.join(process.cwd(), url.fileURLToPath(import.meta.url));
const __dirname = path.dirname(__filename);

const SKIP_FILES = ['node_modules', '.template.json'];


function render(content: string, data: TemplateData) {
  return ejs.render(content, data);
}

console.log(path.resolve(__dirname, 'templates'))
const CHOICES = fs.readdirSync(path.resolve(__dirname, 'templates'));
const QUESTIONS = [
{
    name: 'template',
    type: 'list',
    message: 'What template would you like to use?',
    choices: CHOICES
},
{
    name: 'name',
    type: 'input',
    message: 'Please input a new project name:'
}];

const CURR_DIR = process.cwd();

inquirer.prompt(QUESTIONS).then(answers => {
    const projectChoice = answers['template'];
    const projectName = answers['name'];
    const templatePath = path.join(__dirname, 'templates', projectChoice);
    const targetPath = path.join(CURR_DIR, projectName);

    const options: CliOptions = {
      projectName,
      templateName: projectChoice,
      templatePath,
      targetPath
    }

    if (!createProject(targetPath)) {
      return;
    }

    createDirectoryContents(templatePath, projectName);

    postProcess(options);
});

function createProject(projectPath: string) {
    if (fs.existsSync(projectPath)) {
        console.log(chalk.red(`Folder ${projectPath} exists. Delete or use another name.`));
        return false;
    }
    fs.mkdirSync(projectPath);

    return true;
}


function createDirectoryContents(templatePath: string, projectName: string) {
    // read all files/folders (1 level) from template folder
    const filesToCreate = fs.readdirSync(templatePath);
    // loop each file/folder
    filesToCreate.forEach(file => {
        const origFilePath = path.join(templatePath, file);

        // get stats about the current file
        const stats = fs.statSync(origFilePath);

        // skip files that should not be copied
        if (SKIP_FILES.indexOf(file) > -1) return;

        if (stats.isFile()) {
            // read file content and transform it using template engine
            let contents = fs.readFileSync(origFilePath, 'utf8');
            contents = render(contents, { projectName });
            // write file to destination folder
            const writePath = path.join(CURR_DIR, projectName, file);
            fs.writeFileSync(writePath, contents, 'utf8');
        } else if (stats.isDirectory()) {
            // create folder in destination folder
            fs.mkdirSync(path.join(CURR_DIR, projectName, file));
            // copy files/folder inside current folder recursively
            createDirectoryContents(path.join(templatePath, file), path.join(projectName, file));
        }
    });
}

function postProcess(options: CliOptions) {
  const isNode = fs.existsSync(path.join(options.templatePath, 'package.json'));
  if (isNode) {
      shell.cd(options.targetPath);
      const result = shell.exec('pnpm install');
      if (result.code !== 0) {
          return false;
      }
  }

  return true;
}