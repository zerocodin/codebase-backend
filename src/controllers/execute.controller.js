const { exec } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const PISTON_CLI = "/home/wafi/VS Code/codebase/piston/piston";
const PISTON_API_URL =
  process.env.PISTON_API_URL ||
  "http://localhost:2000/api/v2" ||
  "https://emkc.org/api/v2/piston";

  // Better temp directory handling
const getTempDir = () => {
  if (process.env.TEMP_DIR) {
    return process.env.TEMP_DIR;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'codebase-execution');
  }
  
  return path.join(__dirname, "../../temp");
};
  
const executeJavaScriptViaAPI = async (code, input = "") => {
  try {
    const response = await axios.post(
      `${PISTON_API_URL}/execute`,
      {
        language: "javascript",
        version: "18.15.0",
        files: [
          {
            content: code,
          },
        ],
        stdin: input || "",
        run_timeout: 2000,
        compile_timeout: 2000,
        run_memory_limit: 128,
        compile_memory_limit: 256,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const result = response.data;
    const stdout = result.run?.stdout || "";
    const stderr = result.run?.stderr || "";
    const code_ = result.run?.code || 0;

    const cleanOutput = (output) => {
      if (!output) return "";
      return output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .join("\n");
    };

    return {
      success: code_ === 0,
      output: cleanOutput(stdout),
      error: stderr,
      executionTime: result.run?.time || 0,
      status: code_ === 0 ? "ACCEPTED" : "RUNTIME_ERROR",
    };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        output: "",
        error: error.response.data?.message || "Execution failed",
        executionTime: 0,
        status: "ERROR",
      };
    } else if (error.request) {
      return {
        success: false,
        output: "",
        error: "No response from Piston server. Make sure Piston is running.",
        executionTime: 0,
        status: "ERROR",
      };
    } else {
      return {
        success: false,
        output: "",
        error: error.message || "Execution failed",
        executionTime: 0,
        status: "ERROR",
      };
    }
  }
};

const executeCodeViaCLI = async (language, code, input = "") => {
  try {
    const languageMap = {
      python: "python",
      py: "python",
      python3: "python",
      cpp: "cpp",
      "c++": "cpp",
      c: "c",
      java: "java",
      php: "php",
    };

    const pistonLanguage = languageMap[language] || language;

    // const tempDir = path.join(__dirname, "../../temp");
    const tempDir = getTempDir();
    await fs.ensureDir(tempDir);

    const executionId = uuidv4();
    const codeDir = path.join(tempDir, executionId);
    await fs.ensureDir(codeDir);

    const extMap = {
      python: "py",
      py: "py",
      python3: "py",
      cpp: "cpp",
      "c++": "cpp",
      c: "c",
      java: "java",
      php: "php",
    };

    const ext = extMap[pistonLanguage] || "txt";
    const codeFile = path.join(codeDir, `Main.${ext}`);

    await fs.writeFile(codeFile, code);

    let command = `"${PISTON_CLI}" run ${pistonLanguage} "${codeFile}"`;

    if (input && input.trim()) {
      const inputFile = path.join(codeDir, "input.txt");
      await fs.writeFile(inputFile, input);
      command += ` -i < "${inputFile}"`;
    }

    const timeout = 10000;
    const result = await new Promise((resolve) => {
      const startTime = Date.now();

      exec(
        command,
        { timeout, shell: "/bin/bash" },
        (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;

          const cleanOutput = (output) => {
            if (!output) return "";
            return output
              .replace(/== Compile ==\s*== Run ==\s*STDOUT\s*/g, "")
              .replace(/== Run ==\s*STDOUT\s*/g, "")
              .replace(/STDOUT\s*/g, "")
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line !== "")
              .join("\n");
          };

          if (error) {
            resolve({
              success: false,
              output: cleanOutput(stdout),
              error: stderr || error.message,
              executionTime,
              status: "ERROR",
            });
          } else {
            resolve({
              success: true,
              output: cleanOutput(stdout),
              error: stderr,
              executionTime,
              status: "ACCEPTED",
            });
          }
        },
      );
    });

    await fs.remove(codeDir).catch(() => {});

    return result;
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error.message || "Execution failed",
      executionTime: 0,
      status: "ERROR",
    };
  }
};

const executeCode = async (language, code, input = "") => {
  if (!language || !code) {
    return {
      success: false,
      output: "",
      error: "Language and code are required",
      executionTime: 0,
      status: "ERROR",
    };
  }

  if (language === "javascript" || language === "js" || language === "node") {
    return await executeJavaScriptViaAPI(code, input);
  }

  return await executeCodeViaCLI(language, code, input);
};

const execute = async (req, res) => {
  try {
    const { language, code, input } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required",
      });
    }

    const result = await executeCode(language, code, input || "");

    return res.status(200).json({
      success: true,
      data: {
        language,
        code,
        input: input || "",
        output: result.output || "",
        error: result.error || "",
        executionTime: result.executionTime || 0,
        status: result.status || "ERROR",
      },
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: "Failed to execute code",
      data: {
        language: req.body.language || "unknown",
        code: req.body.code || "",
        input: req.body.input || "",
        output: "",
        error: error.message || "Execution failed",
        executionTime: 0,
        status: "ERROR",
      },
    });
  }
};

/**
 * Get supported languages
 */
const language = async (req, res) => {
  const languages = [
    { id: "python", name: "Python", extension: "py" },
    { id: "javascript", name: "JavaScript", extension: "js" },
    { id: "php", name: "PHP", extension: "php" },
    { id: "cpp", name: "C++", extension: "cpp" },
    { id: "c", name: "C", extension: "c" },
    { id: "java", name: "Java", extension: "java" },
  ];

  return res.status(200).json({
    success: true,
    data: languages,
  });
};

module.exports = {
  language,
  execute,
  executeCode,
};
