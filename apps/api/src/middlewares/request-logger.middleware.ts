import type { RequestHandler } from "express";

function formatDuration(milliseconds: number): string {
    if (milliseconds < 1) {
        return `${milliseconds.toFixed(1)}ms`;
    }

    return `${Math.round(milliseconds)}ms`;
}

export const requestLogger: RequestHandler = (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.once("finish", () => {
        const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
        const elapsedMilliseconds = Number(elapsedNanoseconds) / 1_000_000;

        console.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} in ${formatDuration(elapsedMilliseconds)}`,
        );
    });

    next();
};
