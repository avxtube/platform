import { Router, type NextFunction, type Request, type Response } from "express";
import {
    authenticateUser,
    getRequestActor,
    requireAdmin,
    requireSelfOrAdmin,
} from "../middlewares/user-access.middleware";
import { createUser } from "../services/users/create-user.service";
import { deleteUser } from "../services/users/delete-user.service";
import { getUserById } from "../services/users/get-user-by-id.service";
import { getUsers } from "../services/users/get-users.service";
import { updateUser } from "../services/users/update-user.service";

const router: Router = Router();
type UserParams = { id: string };

router.use(authenticateUser);

router.get("/", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await getUsers();
        res.status(200).json({ users });
    } catch (error) {
        next(error);
    }
});

router.get("/:id", requireSelfOrAdmin, async (req: Request<UserParams>, res: Response, next: NextFunction) => {
    try {
        const user = await getUserById(req.params.id);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
});

router.post("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as Record<string, unknown>;

        if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
            res.status(400).json({ error: "name and email are required" });
            return;
        }

        const user = await createUser({
            ...req.body,
            name: name.trim(),
            email,
        });

        res.status(201).json({ user });
    } catch (error) {
        next(error);
    }
});

router.patch("/:id", requireSelfOrAdmin, async (req: Request<UserParams>, res: Response, next: NextFunction) => {
    try {
        const actor = getRequestActor(res);
        const input = { ...req.body };

        if (!actor.isAdmin) {
            delete input.role;
            delete input.emailVerified;
        }

        const user = await updateUser(req.params.id, input);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
});

router.delete("/:id", requireSelfOrAdmin, async (req: Request<UserParams>, res: Response, next: NextFunction) => {
    try {
        const user = await deleteUser(req.params.id);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
