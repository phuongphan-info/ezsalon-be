import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Transform the data to ensure camelCase field names and respect @Expose/@Exclude decorators
        return instanceToPlain(data, {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
          exposeDefaultValues: true,
        });
      }),
    );
  }
}
